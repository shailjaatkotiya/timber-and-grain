import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import CartItem, OtpCode, User
from ..schemas import MobileIn, OtpRequestOut, OtpVerifyIn, ProfileIn, TokenOut, UserOut
from ..security import create_token, current_user, hash_otp, optional_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def send_sms(mobile: str, code: str) -> None:
    """Plug an SMS provider (MSG91, Twilio, AWS SNS...) in here for production."""
    print(f"[OTP] {mobile}: {code}")


def merge_cart(db: Session, source: User, target: User) -> None:
    """Move a guest's cart into the account they just signed in to (same config => add quantities)."""
    if source.id == target.id:
        return
    existing = {(c.product_id, c.config_key): c for c in target.cart_items}
    for item in list(source.cart_items):
        dup = existing.get((item.product_id, item.config_key))
        if dup:
            dup.quantity = min(dup.quantity + item.quantity, 20)
            db.delete(item)
        else:
            item.user_id = target.id


@router.post("/session", response_model=TokenOut)
def start_guest_session(db: Session = Depends(get_db)):
    """Anonymous guest session so browsing + cart work before any login."""
    user = User(is_guest=True)
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


@router.post("/guest", response_model=TokenOut)
def guest_login(body: MobileIn, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    """Guest checkout: attach a mobile number to the guest session without OTP verification."""
    if user is None or not user.is_guest:
        user = User(is_guest=True)
        db.add(user)
    user.mobile = body.mobile
    db.commit()
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


@router.get("/config")
def auth_config():
    """Tells the frontend which login methods are available."""
    return {"otp_login": settings.otp_login_enabled, "guest_checkout": True}


@router.post("/otp/request", response_model=OtpRequestOut)
def request_otp(body: MobileIn, db: Session = Depends(get_db)):
    if not settings.otp_login_enabled:
        raise HTTPException(503, "OTP login isn't available yet. Please continue as a guest.")
    recent = db.scalar(
        select(OtpCode).where(OtpCode.mobile == body.mobile, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
    )
    if recent and (datetime.now(timezone.utc) - recent.created_at).total_seconds() < 30:
        raise HTTPException(429, "Please wait 30 seconds before requesting another OTP")

    db.execute(update(OtpCode).where(OtpCode.mobile == body.mobile).values(consumed=True))
    code = f"{secrets.randbelow(10**6):06d}"
    db.add(OtpCode(
        mobile=body.mobile,
        code_hash=hash_otp(body.mobile, code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
    ))
    db.commit()
    send_sms(body.mobile, code)
    return OtpRequestOut(
        message="OTP sent",
        expires_in=settings.otp_expire_minutes * 60,
        dev_otp=code if settings.dev_mode else None,
    )


@router.post("/otp/verify", response_model=TokenOut)
def verify_otp(body: OtpVerifyIn, db: Session = Depends(get_db), guest: User | None = Depends(optional_user)):
    otp = db.scalar(
        select(OtpCode).where(OtpCode.mobile == body.mobile, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
    )
    if not otp or otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP expired. Please request a new one")
    if otp.attempts >= settings.otp_max_attempts:
        raise HTTPException(429, "Too many attempts. Please request a new OTP")
    otp.attempts += 1
    if otp.code_hash != hash_otp(body.mobile, body.otp):
        db.commit()
        raise HTTPException(400, "Incorrect OTP")
    otp.consumed = True

    user = db.scalar(select(User).where(User.mobile == body.mobile, User.is_guest.is_(False)))
    if not user:
        user = User(mobile=body.mobile, is_guest=False, is_verified=True, name=body.name)
        db.add(user)
        db.flush()
    elif body.name and not user.name:
        user.name = body.name

    if guest and guest.is_guest:
        merge_cart(db, guest, user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    return user
