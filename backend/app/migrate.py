"""Tiny idempotent schema patches for databases created by earlier versions.

create_all() only creates missing tables; it never adds columns. Swap this for Alembic
once the schema starts changing regularly.
"""
import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url

log = logging.getLogger("uvicorn.error")


def ensure_database(database_url: str) -> None:
    """Create the target database if it doesn't exist yet (first run on a fresh PostgreSQL).

    Connects to the server's built-in `postgres` database to issue CREATE DATABASE.
    If the user lacks the CREATEDB privilege this logs a hint instead of crashing.
    """
    url = make_url(database_url)
    name = url.database
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": name}).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{name}"'))
                log.info("Created database %r", name)
    except Exception as exc:  # noqa: BLE001 - surface a clear hint, the real error follows on first query
        log.warning("Could not check/create database %r (%s). Create it manually: CREATE DATABASE %s;",
                    name, exc.__class__.__name__, name)
    finally:
        admin.dispose()

PATCHES = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS model_url VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS model_yaw DOUBLE PRECISION NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)",
    "ALTER TABLE products DROP COLUMN IF EXISTS model_type",  # v1 procedural models
]


def run(engine: Engine) -> None:
    with engine.begin() as conn:
        exists = conn.execute(text("SELECT to_regclass('public.products')")).scalar()
        if exists:
            for sql in PATCHES:
                conn.execute(text(sql))
