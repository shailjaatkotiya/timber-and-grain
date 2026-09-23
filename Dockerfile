# One container: builds the React app, then serves it and the FastAPI API from uvicorn.
# Works on Render, Railway, Fly.io, Google Cloud Run, Azure Container Apps, or any Docker host.

# ---------- 1. build the frontend ----------
FROM node:20-slim AS web
WORKDIR /web
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2. python runtime ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static DEV_MODE=false PORT=8000
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/dist ./static
RUN useradd --create-home appuser
USER appuser
EXPOSE 8000
# $PORT is provided by the platform (Render/Railway/Cloud Run); defaults to 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
