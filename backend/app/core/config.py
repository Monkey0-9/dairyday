from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import Field, field_validator
import secrets
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dairy Management System"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]

    # Database configuration
    POSTGRES_SERVER: str = "postgres"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "dairy_db"
    DATABASE_URL: Optional[str] = None

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Generate async database URI."""
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:5432/{self.POSTGRES_DB}"

    # Security settings
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="Secret key for JWT")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    LOCK_DAYS: int = 7  # Number of days after which consumption entries become immutable

    # JWT settings
    JWT_AUDIENCE: str = "dairy-os"
    JWT_ISSUER: str = "dairy-os"

    # Rate limiting
    RATE_LIMIT: str = "100/minute"

    # Redis configuration
    REDIS_URL: str = "redis://redis:6379/0"

    # AWS/S3 configuration
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_BUCKET_NAME: str = "dairy-bills"
    AWS_ENDPOINT_URL: Optional[str] = None  # For MinIO/S3 compatible storage
    S3_BUCKET: str = "dairy-bills"  # Alias for S3 bucket name

    # Razorpay configuration
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    # Sentry for error tracking
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator('LOCK_DAYS')
    @classmethod
    def validate_lock_days(cls, v: int) -> int:
        if v < 1 or v > 365:
            raise ValueError("LOCK_DAYS must be between 1 and 365")
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = Settings()
