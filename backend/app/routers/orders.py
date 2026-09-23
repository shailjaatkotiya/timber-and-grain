from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Address, CartItem, Order, OrderItem, User
from ..pricing import resolve_configuration, shipping_for
from ..schemas import AddressOut, CheckoutIn, OrderOut
from ..security import current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
def checkout(body: CheckoutIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not user.mobile:
        raise HTTPException(403, "Log in or continue as guest with your mobile number to check out")
    addr = db.get(Address, body.address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(404, "Address not found")
    cart = db.scalars(select(CartItem).where(CartItem.user_id == user.id)
                      .options(selectinload(CartItem.product))).all()
    if not cart:
        raise HTTPException(400, "Your cart is empty")

    order = Order(user_id=user.id, payment_method=body.payment_method,
                  shipping_address=AddressOut.model_validate(addr).model_dump(), subtotal=0, total=0)
    subtotal = 0
    for it in cart:
        if it.product.stock < it.quantity:
            raise HTTPException(409, f"Only {it.product.stock} left of {it.product.name}")
        config, labels, _, price = resolve_configuration(db, it.product, it.configuration, strict=False)
        order.items.append(OrderItem(
            product_id=it.product_id, product_name=it.product.name, quantity=it.quantity,
            unit_price=price, configuration=config, configuration_labels=labels,
            preview_image=it.preview_image,
        ))
        it.product.stock -= it.quantity
        subtotal += price * it.quantity
        db.delete(it)
    order.subtotal = subtotal
    order.shipping = shipping_for(subtotal)
    order.total = subtotal + order.shipping
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Order).where(Order.user_id == user.id)
                      .options(selectinload(Order.items)).order_by(Order.id.desc())).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    o = db.get(Order, order_id)
    if not o or o.user_id != user.id:
        raise HTTPException(404, "Order not found")
    return o
