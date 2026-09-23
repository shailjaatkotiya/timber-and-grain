"""Idempotent seed: configuration options + 5 tables + 5 chairs (each backed by a GLB model)."""
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from .models import CartItem, ConfigOption, Product

OPTIONS = [
    # group, code, label, color, roughness, metalness, clearcoat, texture, price_delta
    ("wood", "oak", "Natural Oak", "#C49A63", 0.6, 0, 0, "wood", 0),
    ("wood", "ash", "Nordic Ash", "#DCC7A1", 0.6, 0, 0, "wood", 0),
    ("wood", "teak", "Golden Teak", "#9A6433", 0.55, 0, 0, "wood", 3000),
    ("wood", "walnut", "American Walnut", "#5E3B24", 0.55, 0, 0, "wood", 4500),
    ("wood", "cherry", "Cherry", "#8A3E26", 0.55, 0, 0, "wood", 3500),
    ("wood", "smoked", "Smoked Oak", "#3B2C23", 0.6, 0, 0, "wood", 2500),
    ("wood", "whitewash", "Whitewashed Oak", "#E9E0D1", 0.65, 0, 0, "wood", 1500),

    ("finish", "matte", "Matte Oil", "#000000", 0.85, 0, 0.0, "none", 0),
    ("finish", "satin", "Satin Lacquer", "#000000", 0.5, 0, 0.2, "none", 800),
    ("finish", "gloss", "High Gloss", "#000000", 0.2, 0, 0.45, "none", 1800),

    ("frame", "silver", "Classic Silver", "#C4C6C9", 0.45, 0.3, 0, "powder", 0),
    ("frame", "black", "Matte Black", "#26262A", 0.55, 0.2, 0, "powder", 1200),
    ("frame", "sage", "Sage Green", "#8DA38B", 0.5, 0.1, 0, "powder", 1500),
    ("frame", "chalk", "Chalk White", "#ECEBE6", 0.5, 0.1, 0, "powder", 800),
]

WOOD = ["wood", "finish"]
DESK = ["wood", "finish", "frame"]


def _p(slug, name, category, yaw, tagline, description, price, dims, default, groups=WOOD):
    return dict(slug=slug, name=name, category=category, tagline=tagline, description=description,
                base_price=price, dimensions=dims, config_groups=groups, default_config=default,
                model_url=f"/models/{slug}.glb", model_yaw=yaw, image_url=f"/images/products/{slug}.webp")


# Every product is backed by a GLB in frontend/public/models/<slug>.glb.
# dimensions.h (cm) scales the model; w/d follow the model's own proportions.
PRODUCTS = [
    _p("heritage-farmhouse-table", "Heritage Farmhouse Table", "table", 90,
       "A ten-seater with a framed top and stretcher",
       "A long farmhouse dining table with a breadboard-framed top, square legs and a low H-stretcher. "
       "Big enough for the whole family and built to take decades of Sunday lunches.",
       64999, {"w": 235, "d": 136, "h": 72}, {"wood": "teak", "finish": "satin"}),
    _p("harvest-plank-table", "Harvest Plank Table", "table", 90,
       "Rustic planks on four square legs",
       "Wide planks joined edge to edge on four sturdy square legs: a plain, honest table that looks as "
       "good in a kitchen as it does on a covered porch.",
       54999, {"w": 225, "d": 105, "h": 74}, {"wood": "smoked", "finish": "matte"}),
    _p("arbor-pedestal-table", "Arbor Pedestal Table", "table", 0,
       "Round, on a turned pedestal",
       "A round breakfast table on a turned central column and four carved feet, so every chair slides in "
       "without bumping a leg.",
       32999, {"w": 103, "d": 103, "h": 75}, {"wood": "walnut", "finish": "satin"}),
    _p("palazzo-carved-coffee-table", "Palazzo Carved Coffee Table", "table", 0,
       "A low centre table with a carved apron",
       "A generous, low centre table with a moulded top and a scrolled, hand-carved apron. Made to anchor a "
       "living room.",
       38999, {"w": 149, "d": 135, "h": 42}, {"wood": "cherry", "finish": "gloss"}),
    _p("scholar-writing-desk", "Scholar Writing Desk", "table", 0,
       "Solid-wood top on a powder-coated steel frame",
       "A compact study desk: a solid-wood top with a pencil tray underneath, on a powder-coated steel frame "
       "with rubber feet. Choose both the wood and the frame colour.",
       18999, {"w": 86, "d": 59, "h": 76}, {"wood": "oak", "finish": "satin", "frame": "silver"}, DESK),

    _p("oslo-slat-back-chair", "Oslo Slat-Back Chair", "chair", 0,
       "Five slats, a saddle seat and side stretchers",
       "A classic kitchen chair with five vertical back slats, a solid seat and stretchers on every side "
       "for strength.",
       8999, {"w": 42, "d": 51, "h": 95}, {"wood": "oak", "finish": "matte"}),
    _p("vienna-bentwood-chair", "Vienna Bentwood Chair", "chair", 0,
       "Café-style bentwood with an embossed seat",
       "Steam-bent legs and a curved back rail in the Viennese café tradition, with a pressed, embossed "
       "wooden seat.",
       12499, {"w": 49, "d": 50, "h": 90}, {"wood": "teak", "finish": "satin"}),
    _p("porch-rocking-chair", "Porch Rocking Chair", "chair", 0,
       "A spindle-back rocker with arms",
       "A tall spindle-back rocking chair with shaped arms and long runners for a smooth, slow rock.",
       21999, {"w": 75, "d": 78, "h": 105}, {"wood": "walnut", "finish": "satin"}),
    _p("cottage-dining-chair", "Cottage Dining Chair", "chair", 270,
       "A ladder-back chair with a plank seat",
       "A simple ladder-back dining chair with a thick plank seat and low rungs. Light, stackable in pairs "
       "and very easy to live with.",
       7499, {"w": 43, "d": 43, "h": 90}, {"wood": "cherry", "finish": "matte"}),
    _p("bentwood-high-chair", "Bentwood High Chair", "chair", 180,
       "A heritage high chair with a swing-over tray",
       "A bentwood high chair with a swing-over tray, a footrest ring and a patterned back, based on a "
       "classic early-1900s design.",
       14999, {"w": 51, "d": 60, "h": 95}, {"wood": "smoked", "finish": "satin"}),
]


def seed(db: Session) -> None:
    have = {(o.group, o.code) for o in db.scalars(select(ConfigOption)).all()}
    for i, (g, code, label, color, r, m, c, tex, delta) in enumerate(OPTIONS):
        if (g, code) not in have:
            db.add(ConfigOption(group=g, code=code, label=label, color=color, roughness=r, metalness=m,
                                clearcoat=c, texture=tex, price_delta=delta, sort_order=i))

    # Upsert catalogue by slug so edits here reach existing databases.
    existing = {p.slug: p for p in db.scalars(select(Product)).all()}
    for data in PRODUCTS:
        p = existing.get(data["slug"])
        if p:
            for k, v in data.items():
                setattr(p, k, v)
            p.is_active = True
        else:
            db.add(Product(**data))

    # Retire products that are no longer in the catalogue (kept for order history).
    wanted = {d["slug"] for d in PRODUCTS}
    retired = [p.id for s, p in existing.items() if s not in wanted and p.is_active]
    if retired:
        db.execute(delete(CartItem).where(CartItem.product_id.in_(retired)))
        db.execute(update(Product).where(Product.id.in_(retired)).values(is_active=False))
    db.commit()
