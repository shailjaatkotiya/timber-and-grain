from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/furniture"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 60 * 24 * 7
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 5
    dev_mode: bool = True          # shows the OTP on screen; NEVER enable on a public site
    sms_enabled: bool = False      # set true once send_sms() in routers/auth.py talks to a real SMS provider
    cors_origins: str = "http://localhost:5173"
    static_dir: str = ""           # built frontend (frontend/dist) to serve from this app; empty = API only

    @field_validator("database_url")
    @classmethod
    def _psycopg_driver(cls, v: str) -> str:
        # Hosts (Render, Railway, Neon, Heroku) hand out postgres:// or postgresql:// URLs;
        # SQLAlchemy needs the driver named explicitly.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @property
    def otp_login_enabled(self) -> bool:
        return self.dev_mode or self.sms_enabled

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
