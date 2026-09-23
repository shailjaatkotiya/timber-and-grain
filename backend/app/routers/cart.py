from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import CartItem, Product, User
from ..pricing import config_key, resolve_configuration, shipping_for
from ..schemas import CartAddIn, CartItemOut, CartOut, CartUpdateIn, ProductOut
from ..security import current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])


def build_cart(db: Session, user: User) -> CartOut:
    items = db.scalars(
        select(CartItem).where(CartItem.user_id == user.id)
        .options(selectinload(CartItem.product)).order_by(CartItem.created_at)
    ).all()
    out, subtotal = [], Decimal("0")
    for it in items:
        # Re-price on every read so option price changes are reflected before checkout.
        clean, labels, colors, price = resolve_configuration(db, it.product, it.configuration, strict=False)
        if clean != it.configuration:  # catalogue changed since this was added
            it.configuration, it.config_key = clean, config_key(clean)
        it.unit_price = price
        line = price * it.quantity
        subtotal += line
        out.append(CartItemOut(
            id=it.id, product=ProductOut.model_validate(it.product), quantity=it.quantity,
            configuration=clean, configuration_labels=labels, configuration_colors=colors,
            unit_price=price, line_total=line, preview_image=it.preview_image,
        ))
    db.commit()
    shipping = shipping_for(subtotal)
    return CartOut(items=out, item_count=sum(i.quantity for i in out),
                   subtotal=subtotal, shipping=shipping, total=subtotal + shipping)


@router.get("", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return build_cart(db, user)


@router.post("/items", response_model=CartOut, status_code=201)
def add_item(body: CartAddIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    product = db.get(Product, body.product_id)
    if not product or not product.is_active:
        raise HTTPException(404, "Product not found")
    config, _, _, price = resolve_configuration(db, product, body.configuration)
    key = config_key(config)
    existing = db.scalar(select(CartItem).where(
        CartItem.user_id == user.id, CartItem.product_id == product.id, CartItem.config_key == key))
    if existing:
        existing.quantity = min(existing.quantity + body.quantity, 20)
        if body.preview_image:
            existing.preview_image = body.preview_image
    else:
        db.add(CartItem(user_id=user.id, product_id=product.id, quantity=body.quantity,
                        configuration=config, config_key=key, unit_price=price,
                        preview_image=body.preview_image))
    db.commit()
    return build_cart(db, user)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(item_id: int, body: CartUpdateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Cart item not found")
    item.quantity = body.quantity
    db.commit()
    return build_cart(db, user)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.get(CartItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Cart item not found")
    db.delete(item)
    db.commit()
    return build_cart(db, user)
