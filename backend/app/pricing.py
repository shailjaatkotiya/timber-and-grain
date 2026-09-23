"""Server-side validation and pricing of a product configuration.

The client never sends a price: we recompute it from the chosen options so the
cart and orders can't be tampered with.
"""
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ConfigOption, Product

FREE_SHIPPING_OVER = Decimal("25000")
SHIPPING_FEE = Decimal("999")


def options_by_group(db: Session, groups: list[str]) -> dict[str, list[ConfigOption]]:
    rows = db.scalars(
        select(ConfigOption).where(ConfigOption.group.in_(groups)).order_by(ConfigOption.sort_order)
    ).all()
    out: dict[str, list[ConfigOption]] = {g: [] for g in groups}
    for r in rows:
        out[r.group].append(r)
    return out


def resolve_configuration(db: Session, product: Product, config: dict[str, str], strict: bool = True):
    """Returns (clean_config, labels, colors, unit_price).

    strict=True (customer input): raises 422 on unknown keys or invalid codes.
    strict=False (re-pricing stored carts): drops stale keys and falls back to the product
    default, so a catalogue change never breaks an existing cart.
    """
    opts = options_by_group(db, product.config_groups)
    clean, labels, colors = {}, {}, {}
    price = Decimal(product.base_price)
    for group in product.config_groups:
        code = config.get(group) or product.default_config.get(group)
        match = next((o for o in opts[group] if o.code == code), None)
        if not match and not strict:
            code = product.default_config.get(group)
            match = next((o for o in opts[group] if o.code == code), None) or (opts[group][0] if opts[group] else None)
        if not match:
            raise HTTPException(422, f"Invalid option '{code}' for '{group}'")
        clean[group] = match.code
        labels[group] = match.label
        colors[group] = match.color
        price += Decimal(match.price_delta)
    unknown = set(config) - set(product.config_groups)
    if unknown and strict:
        raise HTTPException(422, f"Unknown configuration keys: {', '.join(sorted(unknown))}")
    return clean, labels, colors, price


def config_key(config: dict[str, str]) -> str:
    return "|".join(f"{k}={config[k]}" for k in sorted(config))


def shipping_for(subtotal: Decimal) -> Decimal:
    if subtotal == 0 or subtotal >= FREE_SHIPPING_OVER:
        return Decimal("0")
    return SHIPPING_FEE
