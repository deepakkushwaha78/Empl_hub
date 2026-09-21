from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Employee Management API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str | None = None
    jwt_secret_key: str | None = None
    jwt_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
