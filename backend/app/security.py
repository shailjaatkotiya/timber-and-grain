import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "guest": user.is_guest,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def hash_otp(mobile: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{mobile}:{code}".encode(), hashlib.sha256).hexdigest()


def _user_from_creds(creds: HTTPAuthorizationCredentials | None, db: Session) -> User | None:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return db.get(User, int(payload["sub"]))


def optional_user(creds=Depends(bearer), db: Session = Depends(get_db)) -> User | None:
    return _user_from_creds(creds, db)


def current_user(creds=Depends(bearer), db: Session = Depends(get_db)) -> User:
    user = _user_from_creds(creds, db)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user
