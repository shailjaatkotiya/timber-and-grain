import re
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MOBILE_RE = re.compile(r"^[6-9]\d{9}$")  # Indian 10-digit mobile numbers


def normalise_mobile(v: str) -> str:
    digits = re.sub(r"\D", "", v or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if not MOBILE_RE.match(digits):
        raise ValueError("Enter a valid 10-digit mobile number")
    return digits


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class MobileIn(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        return normalise_mobile(v)


class OtpRequestOut(BaseModel):
    message: str
    expires_in: int
    dev_otp: str | None = None


class OtpVerifyIn(MobileIn):
    otp: str = Field(min_length=4, max_length=8)
    name: str | None = None


class UserOut(ORM):
    id: int
    mobile: str | None
    name: str | None
    email: str | None
    is_guest: bool
    is_verified: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileIn(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=255)


# ---------- catalogue ----------
class ConfigOptionOut(ORM):
    group: str
    code: str
    label: str
    color: str
    roughness: float
    metalness: float
    clearcoat: float
    texture: str
    price_delta: Decimal


class ProductOut(ORM):
    id: int
    slug: str
    name: str
    category: str
    tagline: str
    description: str
    base_price: Decimal
    model_url: str
    model_yaw: float
    image_url: str | None
    dimensions: dict
    config_groups: list[str]
    default_config: dict
    stock: int


class ProductDetailOut(ProductOut):
    options: dict[str, list[ConfigOptionOut]]


# ---------- addresses ----------
class AddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str
    line1: str = Field(min_length=3, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    pincode: str
    landmark: str | None = Field(default=None, max_length=120)
    is_default: bool = False

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalise_mobile(v)

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v: str) -> str:
        if not re.fullmatch(r"[1-9]\d{5}", v.strip()):
            raise ValueError("Enter a valid 6-digit PIN code")
        return v.strip()


class AddressOut(ORM):
    id: int
    full_name: str
    phone: str
    line1: str
    line2: str | None
    city: str
    state: str
    pincode: str
    landmark: str | None
    is_default: bool


# ---------- cart ----------
class CartAddIn(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=20)
    configuration: dict[str, str]
    preview_image: str | None = Field(default=None, max_length=200_000)


class CartUpdateIn(BaseModel):
    quantity: int = Field(ge=1, le=20)


class CartItemOut(ORM):
    id: int
    product: ProductOut
    quantity: int
    configuration: dict[str, str]
    configuration_labels: dict[str, str] = {}
    configuration_colors: dict[str, str] = {}
    unit_price: Decimal
    line_total: Decimal
    preview_image: str | None


class CartOut(BaseModel):
    items: list[CartItemOut]
    item_count: int
    subtotal: Decimal
    shipping: Decimal
    total: Decimal


# ---------- orders ----------
class CheckoutIn(BaseModel):
    address_id: int
    payment_method: str = Field(default="cod", pattern="^(cod)$")


class OrderItemOut(ORM):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    configuration: dict
    configuration_labels: dict
    preview_image: str | None


class OrderOut(ORM):
    id: int
    status: str
    payment_method: str
    subtotal: Decimal
    shipping: Decimal
    total: Decimal
    shipping_address: dict
    created_at: object
    items: list[OrderItemOut]
