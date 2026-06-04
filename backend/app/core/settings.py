from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(
        default="postgresql+asyncpg://pakalorie:pakalorie@localhost:5432/pakalorie",
        alias="DATABASE_URL",
    )
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3-flash-preview", alias="GEMINI_MODEL")
    gemini_api_url: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta",
        alias="GEMINI_API_URL",
    )
    gemini_timeout_seconds: float = Field(default=20.0, alias="GEMINI_TIMEOUT_SECONDS")
    cors_origins: str = Field(
        default="https://*.expo.dev,exp://*,http://localhost:8081,http://localhost:19006",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cors_literal_origins(self) -> list[str]:
        return [origin for origin in self.cors_origin_list if "*" not in origin]

    @property
    def cors_origin_regex(self) -> str | None:
        regex_parts: list[str] = []
        for origin in self.cors_origin_list:
            if origin == "https://*.expo.dev":
                regex_parts.append(r"https://.*\.expo\.dev")
            elif origin == "exp://*":
                regex_parts.append(r"exp://.*")
            elif "*" in origin:
                regex_parts.append(origin.replace(".", r"\.").replace("*", ".*"))
        return "|".join(regex_parts) or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
