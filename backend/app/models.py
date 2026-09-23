from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    mobile: Mapped[str | None] = mapped_column(String(15), index=True)
    name: Mapped[str | None] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255))
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    addresses: Mapped[list["Address"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    mobile: Mapped[str] = mapped_column(String(15), index=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(15))
    line1: Mapped[str] = mapped_column(String(255))
    line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(80))
    pincode: Mapped[str] = mapped_column(String(10))
    landmark: Mapped[str | None] = mapped_column(String(120))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="addresses")


class ConfigOption(Base):
    """A selectable configuration value, e.g. wood=walnut, finish=gloss, legs=brass."""
    __tablename__ = "config_options"
    __table_args__ = (UniqueConstraint("group", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    group: Mapped[str] = mapped_column(String(40), index=True)
    code: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(80))
    color: Mapped[str] = mapped_column(String(9))          # hex base colour for the 3D material
    roughness: Mapped[float] = mapped_column(default=0.6)
    metalness: Mapped[float] = mapped_column(default=0.0)
    clearcoat: Mapped[float] = mapped_column(default=0.0)
    texture: Mapped[str] = mapped_column(String(20), default="wood")  # wood | fabric | metal | none
    price_delta: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20), index=True)   # table | chair
    tagline: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    model_url: Mapped[str] = mapped_column(String(255))             # GLB served by the frontend, e.g. /models/x.glb
    model_yaw: Mapped[float] = mapped_column(default=0.0)           # degrees to turn the GLB so its front faces the camera
    image_url: Mapped[str | None] = mapped_column(String(255))      # listing image rendered from the GLB
    dimensions: Mapped[dict] = mapped_column(JSONB, default=dict)   # cm; "h" is also used to scale the GLB
    config_groups: Mapped[list] = mapped_column(JSONB, default=list)  # e.g. ["wood","finish","frame"]
    default_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    stock: Mapped[int] = mapped_column(Integer, default=25)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    configuration: Mapped[dict] = mapped_column(JSONB)      # {"wood": "walnut", "finish": "satin", ...}
    config_key: Mapped[str] = mapped_column(String(255))    # canonical string so identical configs merge
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    preview_image: Mapped[str | None] = mapped_column(Text)  # small JPEG data-URL rendered by the configurator
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="cart_items")
    product: Mapped[Product] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="placed")
    payment_method: Mapped[str] = mapped_column(String(20), default="cod")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    shipping: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    shipping_address: Mapped[dict] = mapped_column(JSONB)   # snapshot, so later edits don't change the order
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(120))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    configuration: Mapped[dict] = mapped_column(JSONB)
    configuration_labels: Mapped[dict] = mapped_column(JSONB)
    preview_image: Mapped[str | None] = mapped_column(Text)

    order: Mapped[Order] = relationship(back_populates="items")
