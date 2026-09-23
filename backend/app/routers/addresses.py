from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Address, User
from ..schemas import AddressIn, AddressOut
from ..security import current_user

router = APIRouter(prefix="/api/addresses", tags=["addresses"])


def _own(db: Session, user: User, address_id: int) -> Address:
    a = db.get(Address, address_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Address not found")
    return a


def _set_default(db: Session, user: User, addr: Address):
    db.execute(update(Address).where(Address.user_id == user.id, Address.id != addr.id).values(is_default=False))
    addr.is_default = True


@router.get("", response_model=list[AddressOut])
def list_addresses(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Address).where(Address.user_id == user.id)
                      .order_by(Address.is_default.desc(), Address.id.desc())).all()


@router.post("", response_model=AddressOut, status_code=201)
def create_address(body: AddressIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    addr = Address(user_id=user.id, **body.model_dump())
    db.add(addr)
    db.flush()
    first = db.scalar(select(Address.id).where(Address.user_id == user.id, Address.id != addr.id)) is None
    if body.is_default or first:
        _set_default(db, user, addr)
    db.commit()
    return addr


@router.put("/{address_id}", response_model=AddressOut)
def update_address(address_id: int, body: AddressIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    addr = _own(db, user, address_id)
    for k, v in body.model_dump().items():
        setattr(addr, k, v)
    if body.is_default:
        _set_default(db, user, addr)
    db.commit()
    return addr


@router.delete("/{address_id}", status_code=204)
def delete_address(address_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(_own(db, user, address_id))
    db.commit()
