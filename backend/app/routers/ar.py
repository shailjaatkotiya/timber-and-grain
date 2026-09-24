"""Short-lived hosting for configured AR models.

AR viewers can't reliably open in-memory blob: URLs:
  * iOS AR Quick Look in Chrome / Firefox / Edge ignores blob USDZ files,
  * Google Scene Viewer (Android) downloads the model itself, so it needs a public HTTPS URL.
The browser exports the customer's configured model (GLB for Android, USDZ for iOS), uploads it
here, and gets back a URL that native AR apps can open. Files expire after AR_TTL_SECONDS.
"""
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from ..models import User
from ..security import current_user

router = APIRouter(prefix="/api/ar", tags=["ar"])

AR_DIR = Path("/tmp/ar-models")
AR_TTL_SECONDS = 2 * 60 * 60
MAX_BYTES = 25 * 1024 * 1024
FORMATS = {
    # ext: (content type, magic bytes)
    "glb": ("model/gltf-binary", b"glTF"),
    "usdz": ("model/vnd.usdz+zip", b"PK\x03\x04"),
}


def _cleanup() -> None:
    cutoff = time.time() - AR_TTL_SECONDS
    for f in AR_DIR.glob("*"):
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
        except OSError:
            pass


@router.post("/models", status_code=201)
async def upload_model(request: Request, fmt: str, user: User = Depends(current_user)):
    if fmt not in FORMATS:
        raise HTTPException(422, "fmt must be glb or usdz")
    declared = int(request.headers.get("content-length") or 0)
    if declared > MAX_BYTES:
        raise HTTPException(413, "Model too large")
    data = await request.body()
    content_type, magic = FORMATS[fmt]
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Model too large")
    if not data.startswith(magic):
        raise HTTPException(422, f"Not a valid {fmt.upper()} file")
    AR_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup()
    name = f"{uuid.uuid4().hex}.{fmt}"
    (AR_DIR / name).write_bytes(data)
    return {"url": f"/api/ar/models/{name}", "expires_in": AR_TTL_SECONDS}


@router.get("/models/{name}")
def get_model(name: str):
    stem, _, ext = name.partition(".")
    if ext not in FORMATS or len(stem) != 32 or not all(c in "0123456789abcdef" for c in stem):
        raise HTTPException(404, "Not found")
    path = AR_DIR / name
    if not path.is_file() or path.stat().st_mtime < time.time() - AR_TTL_SECONDS:
        raise HTTPException(404, "This AR link has expired. Please open AR again from the product page.")
    return FileResponse(path, media_type=FORMATS[ext][0], headers={
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",   # Scene Viewer / Quick Look fetch it directly
    })
