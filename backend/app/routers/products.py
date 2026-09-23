from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConfigOption, Product
from ..pricing import options_by_group
from ..schemas import ConfigOptionOut, ProductDetailOut, ProductOut

router = APIRouter(prefix="/api", tags=["catalogue"])


@router.get("/products", response_model=list[ProductOut])
def list_products(category: str | None = Query(None, pattern="^(table|chair)$"), db: Session = Depends(get_db)):
    q = select(Product).where(Product.is_active.is_(True)).order_by(Product.category.desc(), Product.base_price.desc())
    if category:
        q = q.where(Product.category == category)
    return db.scalars(q).all()


@router.get("/products/{slug}", response_model=ProductDetailOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    p = db.scalar(select(Product).where(Product.slug == slug, Product.is_active.is_(True)))
    if not p:
        raise HTTPException(404, "Product not found")
    opts = options_by_group(db, p.config_groups)
    return ProductDetailOut(
        **ProductOut.model_validate(p).model_dump(),
        options={g: [ConfigOptionOut.model_validate(o) for o in lst] for g, lst in opts.items()},
    )


@router.get("/config-options", response_model=list[ConfigOptionOut])
def all_options(db: Session = Depends(get_db)):
    return db.scalars(select(ConfigOption).order_by(ConfigOption.group, ConfigOption.sort_order)).all()
