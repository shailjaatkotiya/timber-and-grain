"""Short-lived hosting for configured AR models.

Native AR viewers need a real HTTPS URL, not an in-memory blob:
  * iPhone Safari: AR Quick Look via <a rel="ar"> to the USDZ.
  * iPhone Chrome / Firefox / Edge: the browser itself hands a navigated-to .usdz to Quick Look.
  * Android (any browser): Google Scene Viewer downloads the GLB itself.
The browser exports the customer's configured model, uploads it here and opens the returned URL.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ArModel, User
from ..security import current_user

router = APIRouter(prefix="/api/ar", tags=["ar"])

TTL = timedelta(hours=2)
MAX_BYTES = 25 * 1024 * 1024
FORMATS = {
    # ext: (content type, magic bytes)
    "glb": ("model/gltf-binary", b"glTF"),
    "usdz": ("model/vnd.usdz+zip", b"PK\x03\x04"),
}


@router.post("/models", status_code=201)
async def upload_model(request: Request, fmt: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if fmt not in FORMATS:
        raise HTTPException(422, "fmt must be glb or usdz")
    if int(request.headers.get("content-length") or 0) > MAX_BYTES:
        raise HTTPException(413, "Model too large")
    data = await request.body()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Model too large")
    if not data.startswith(FORMATS[fmt][1]):
        raise HTTPException(422, f"Not a valid {fmt.upper()} file")
    db.execute(delete(ArModel).where(ArModel.created_at < datetime.now(timezone.utc) - TTL))
    model = ArModel(id=uuid.uuid4().hex, fmt=fmt, data=data)
    db.add(model)
    db.commit()
    return {"url": f"/api/ar/models/{model.id}.{fmt}", "expires_in": int(TTL.total_seconds())}


@router.get("/models/{name}")
def get_model(name: str, db: Session = Depends(get_db)):
    stem, _, ext = name.partition(".")
    if ext not in FORMATS or len(stem) != 32:
        raise HTTPException(404, "Not found")
    model = db.get(ArModel, stem)
    if not model or model.fmt != ext or model.created_at < datetime.now(timezone.utc) - TTL:
        raise HTTPException(404, "This AR link has expired. Open the product page and tap View in your room again.")
    return Response(model.data, media_type=FORMATS[ext][0], headers={
        "Content-Disposition": f'inline; filename="timber-and-grain.{ext}"',
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",   # Scene Viewer / Quick Look fetch it directly
    })
