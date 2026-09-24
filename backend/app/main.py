from contextlib import asynccontextmanager

import mimetypes
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from . import migrate
from .database import Base, SessionLocal, engine
from .routers import addresses, ar, auth, cart, orders, products
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # For production, replace create_all with Alembic migrations.
    migrate.ensure_database(settings.database_url)
    migrate.run(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Timber & Grain API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, products.router, cart.router, addresses.router, orders.router, ar.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}


# ---- Serve the built React app (single-service deployment) -------------------------------
# With STATIC_DIR=frontend/dist the API and the website share one origin: no CORS, one service.
# slim container images ship without a MIME table: make 3D models, WebP and JS modules explicit
for _ext, _type in {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".webp": "image/webp",
                    ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".usdz": "model/vnd.usdz+zip"}.items():
    mimetypes.add_type(_type, _ext)

_static = Path(settings.static_dir).resolve() if settings.static_dir else None
if _static and (_static / "index.html").is_file():

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not found")
        file = (_static / full_path).resolve()
        if full_path and file.is_file() and _static in file.parents:
            # hashed bundles can be cached forever; models/images for a day
            cache = "public, max-age=31536000, immutable" if full_path.startswith("assets/") else "public, max-age=86400"
            return FileResponse(file, headers={"Cache-Control": cache})
        # client-side routes (/product/x, /cart, ...) all get the app shell
        return FileResponse(_static / "index.html", headers={"Cache-Control": "no-cache"})
