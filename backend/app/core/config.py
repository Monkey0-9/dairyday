from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import Field, field_validator
import logging
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dairy Management System"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"
    ]
    
    # Base URL for public access (used for absolute links)
    BASE_URL: str = "http://localhost:8000"

    # Database configuration
    POSTGRES_SERVER: str = "postgres"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "dairy_db"
    # Default to SQLite for local development if not set
    DATABASE_URL: Optional[str] = "sqlite+aiosqlite:///./dairy.db"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Generate async database URI."""
        if self.DATABASE_URL:
            # Handle both postgres:// and postgresql:// and inject asyncpg
            uri = self.DATABASE_URL
            if uri.startswith("postgres://"):
                uri = uri.replace("postgres://", "postgresql+asyncpg://", 1)
            elif uri.startswith("postgresql://"):
                uri = uri.replace("postgresql://", "postgresql+asyncpg://", 1)
            
            # Strip sslmode from the URI as asyncpg doesn't support it in the query string
            if "sslmode=" in uri:
                from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
                u = urlparse(uri)
                q = parse_qs(u.query)
                q.pop('sslmode', None)
                uri = urlunparse(u._replace(query=urlencode(q, doseq=True)))
            
            return uri
            
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:5432/{self.POSTGRES_DB}"
        )

    # Security settings
    SECRET_KEY: str = Field(
        default="development_secret_key_change_me",
        description="Secret key for JWT"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    LOCK_DAYS: int = 7  # Number of days after which consumption entries become immutable

    # JWT settings
    JWT_AUDIENCE: str = Field(default="dairy-day", env="JWT_AUDIENCE")
    JWT_ISSUER: str = Field(default="dairy-day", env="JWT_ISSUER")

    # Logto settings
    LOGTO_ISSUER: str = "https://wg5ds8.logto.app/oidc"
    LOGTO_JWKS_URI: str = "https://wg5ds8.logto.app/oidc/jwks"
    LOGTO_AUDIENCE: str = "http://localhost:8000"
    LOGTO_ALGORITHM: str = "ES384"

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

    # SMTP Settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = "DairyDay"

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

    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    s = Settings()
    import os
    from pathlib import Path

    # Check if secure
    is_secure = False
    if os.environ.get('SECRET_KEY'):
        is_secure = True
    else:
        env_file = Path(s.model_config.get('env_file', '.env'))
        if env_file.exists():
            content = env_file.read_text(encoding='utf-8')
            if 'SECRET_KEY' in content:
                is_secure = True
                
    if not is_secure:
        logging.warning(
            "⚠️  SECRET_KEY not set via environment variable or .env file. "
            "A random key has been generated. Sessions will NOT survive restarts. "
            "Set SECRET_KEY in .env for production."
        )
    return s


settings = get_settings()
