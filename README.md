# Timber & Grain — 3D furniture configurator + e-commerce

A furniture store where customers pick a table or chair, configure its wood and finish
(and the desk's frame colour) on the real GLB model in 3D, and check out with the configuration attached.

**Stack:** FastAPI · PostgreSQL · SQLAlchemy 2 · React 18 · Redux Toolkit · Three.js (GLB models, AR Quick Look / Scene Viewer export) · Vite

## What's included

| Requirement | Where |
|---|---|
| Landing page with a 3D table that rotates as you scroll | `frontend/src/pages/Home.jsx`, `components/HeroScene.jsx` |
| 5 tables + 5 chairs, each a GLB model | `frontend/public/models/*.glb`, seeded by `backend/app/seed.py` |
| Listing images rendered from the GLBs | `frontend/public/images/products/*.webp`, made by `npm run render:images` |
| Mobile-number login (OTP) and guest checkout with mobile number | `backend/app/routers/auth.py`, `frontend/src/pages/Login.jsx` |
| Addresses (add / edit / delete / default) | `routers/addresses.py`, `pages/Account.jsx`, `components/AddressForm.jsx` |
| Cart | `routers/cart.py`, `store/cartSlice.js`, `pages/Cart.jsx` |
| Product page loads the 3D configurator | `pages/Product.jsx`, `components/Configurator.jsx` |
| Configuration moves to the cart with the product | `POST /api/cart/items` stores `configuration` + a rendered preview image |
| Checkout → order (cash/UPI on delivery) | `routers/orders.py`, `pages/Checkout.jsx` |

## Run it locally

**Prerequisites:** Python 3.10+, Node 18+, PostgreSQL 14+ (or Docker).

1. **Database**:  `docker compose up -d`, or create a database called `furniture` in your own PostgreSQL.
2. **Backend** (http://localhost:8000, interactive API docs at http://localhost:8000/docs)
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   copy .env.example .env           # macOS/Linux: cp .env.example .env  — then edit DATABASE_URL if needed
   uvicorn app.main:app --reload --port 8000
   ```
   Tables are created and products seeded automatically on startup.
3. **Frontend** (http://localhost:5173)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Vite proxies `/api` to the backend, so no CORS setup is needed in development.

On Windows you can also double-click `start-backend.bat` and `start-frontend.bat`.

### Logging in during development
With `DEV_MODE=true` (the default in `.env.example`), the OTP is returned by the API and shown
on the login screen, and printed in the backend console. For production set `DEV_MODE=false`
and connect an SMS provider in `send_sms()` in `backend/app/routers/auth.py`.

## How it works

### Sessions, guests and login
* On first visit the app calls `POST /api/auth/session` to get an **anonymous guest token**, so
  browsing and the cart work immediately.
* **Guest checkout:** `POST /api/auth/guest {mobile}` attaches a mobile number to that same guest
  session (no OTP), which unlocks checkout.
* **OTP login:** `POST /api/auth/otp/request` → `POST /api/auth/otp/verify`. OTPs are stored hashed,
  expire after 5 minutes, allow 5 attempts, and are rate-limited to one every 30 s. The guest's
  cart is **merged** into the account on login (same product + same configuration → quantities add up).
* Tokens are JWTs (HS256) sent as `Authorization: Bearer …`.

### 3D models (GLB)
* Each product row has `model_url` (for example `/models/oslo-slat-back-chair.glb`), `model_yaw` (degrees to
  turn the model so its front faces the camera) and `dimensions.h` (cm). The loader scales the GLB to that real
  height, stands it on the floor and centres it, so models authored in any unit (cm, m, arbitrary) line up.
* The supplied Sketchfab models were optimised with gltf-transform (meshopt geometry compression, WebP
  textures at 1024 px, and the 1.2M-vertex high-chair scan simplified to about 80k). They went from 97 MB to
  about 3 MB in total. The floor tiles bundled with one chair model were removed.
* **The same GLB is used everywhere:** the listing image, the product configurator and the landing-page hero.

### Configurator: how the wood colour changes
Every model uses one baked texture for everything (wood, steel, rubber), so we recolour that texture instead of
swapping materials (`frontend/src/three/recolor.js`):
1. Each texel is classified once: *wood* (warm hue with some saturation) or *frame* (light, unsaturated, e.g. the desk's steel).
2. For a configuration, texels are re-tinted to the chosen species while keeping their relative brightness,
   so the model's own grain, knots and wear stay visible. The desk's frame texels take the chosen frame colour.
3. The finish option sets roughness and clearcoat. The model's own normal and AO maps are kept.

Options live in the `config_options` table (colour, roughness, clearcoat, price delta), so a new species is one row.

### Product images
Listing images are rendered from the GLBs with each product's default configuration, using the same
viewer code as the configurator:
```bash
npx playwright install chromium   # once
# with the backend (8000) and `npm run dev` (5173) running:
cd frontend
npm run render:images                 # all products
npm run render:images -- <slug>       # one product
```
Images are written to `frontend/public/images/products/<slug>.webp` (the path in `products.image_url`).

### Adding a product
1. Drop the GLB in `frontend/public/models/<slug>.glb` (optimise big ones:
   `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`).
2. Add it to `PRODUCTS` in `backend/app/seed.py` (restart the API: seeding upserts by slug).
3. Run `npm run render:images -- <slug>`.

### View in your room (AR)
A single **View in your room** button sits on the 3D view. AR always shows the **configured** piece at true size:
the model is baked (scale, yaw and floor offset built into the geometry), exported in the browser (USDZ on iOS, GLB on
Android), uploaded to `POST /api/ar/models` and served from `/api/ar/models/<id>.usdz|glb` (stored in Postgres,
expires after 2 h). On phones this runs **in the background** once the configuration settles, so one tap opens AR.

| Device | What the tap does |
|---|---|
| iPhone / iPad, Safari | Apple **AR Quick Look** via `<a rel="ar"><img></a>` (floor tracking, real size) |
| iPhone / iPad, Chrome / Firefox / Edge | navigates to the `.usdz`; these browsers hand it to AR Quick Look (they ignore `rel="ar"`, which only Safari handles) |
| Android, any browser | Google **Scene Viewer** intent. Phones without Google AR fall back to the live camera view (`?ar=camera`) |
| Desktop | QR code → the same product and configuration on the phone, AR prepared automatically |

If the customer taps before the file is ready, the button shows *Preparing 3D…* and then *Tap to open in your room*,
because AR viewers only open from a direct tap. Quick Look and Scene Viewer ask for the camera themselves (a system
prompt). The camera fallback asks through the browser and shows per-browser steps if the camera is blocked.

### Configuration → cart → order
* The client sends `{product_id, quantity, configuration, preview_image}`. It **never sends a price**.
  The server validates each option against the product's allowed groups and computes
  `base_price + Σ price_delta` (`backend/app/pricing.py`).
* Identical configurations merge into one cart line; different ones are separate lines.
* `preview_image` is a small JPEG snapshot of the configured model, shown in the cart, checkout and order.
* At checkout the order stores a **snapshot** of each item's configuration and labels and of the
  shipping address, so later edits never change a placed order. Stock is decremented.
* Shipping: free over ₹25,000, otherwise ₹999.

## API overview

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/session` | Anonymous guest token |
| POST | `/api/auth/guest` | Guest checkout with mobile number |
| POST | `/api/auth/otp/request` · `/api/auth/otp/verify` | OTP login (merges guest cart) |
| GET/PATCH | `/api/auth/me` | Profile |
| GET | `/api/products?category=table\|chair` | Catalogue |
| GET | `/api/products/{slug}` | Product + its configuration options |
| GET | `/api/config-options` | All options |
| GET · POST · PATCH · DELETE | `/api/cart`, `/api/cart/items[/{id}]` | Cart |
| GET · POST · PUT · DELETE | `/api/addresses[/{id}]` | Addresses |
| GET · POST | `/api/orders[/{id}]` | Checkout and order history |

## Deploy (Render, Railway or any Docker host)
The app ships as **one Docker container** (FastAPI serves both `/api` and the built React site) plus **one PostgreSQL**.
The container runs as a normal long-lived server, so the 3D models, AR and startup seeding need no changes.

### Render (recommended: web service + Postgres from one file, HTTPS included)
1. Push this folder to a GitHub/GitLab repo (`git init && git add . && git commit -m "Timber & Grain" && git push`).
2. Render dashboard → **New → Blueprint** → pick the repo → **Apply**. `render.yaml` creates:
   * `timber-and-grain`: the Docker web service (health check `/api/health`)
   * `timber-and-grain-db`: PostgreSQL, wired in as `DATABASE_URL`, plus a generated `JWT_SECRET`
3. On first start the app creates its tables and loads the 10 products. Open the `*.onrender.com` URL.

### Railway
New Project → Deploy from GitHub repo (it picks up `Dockerfile` and `railway.json`) → **+ New → Database → PostgreSQL**.
In the web service's Variables add `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET=<random>` and `DEV_MODE=false`,
then Settings → Networking → **Generate Domain**.

### Anywhere else with Docker
```bash
docker build -t timber-grain .
docker run -p 8000:8000 -e DATABASE_URL=postgres://user:pass@host:5432/furniture -e JWT_SECRET=<random> timber-grain
```

### Production behaviour
* `DEV_MODE=false` (the Dockerfile's default) stops login codes appearing on screen. Until an SMS provider is connected,
  **OTP login is hidden and customers check out as guests with their mobile number.** To enable OTP login, implement
  `send_sms()` in `backend/app/routers/auth.py` (MSG91, Twilio, AWS SNS…) and set `SMS_ENABLED=true`.
* `postgres://` URLs from hosting providers are accepted as-is.
* Free Render instances sleep after 15 minutes idle (the first visit then takes ~30 s). Use the Starter plan for a live store.
* AR on Android needs HTTPS, which Render and Railway provide automatically.

## Production checklist
* Replace `Base.metadata.create_all` plus `app/migrate.py` with **Alembic** migrations.
* Set a strong `JWT_SECRET`, `DEV_MODE=false`, and real `CORS_ORIGINS`.
* Plug in an SMS provider (MSG91 / Twilio / AWS SNS) and a payment gateway (Razorpay / Stripe) in `routers/orders.py`.
* `npm run build` produces static files in `frontend/dist` for any static host or CDN. Set
  `VITE_API_URL` to the API's public URL.
* Consider moving `preview_image` from the database to object storage (S3) at scale.
