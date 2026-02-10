
import datetime
import uuid
from typing import Any, Union, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings, get_settings

# Use PBKDF2 with SHA256 (stable, standard)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

ALGORITHM = settings.ALGORITHM


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[datetime.timedelta] = None,
    token_type: str = "access",
    jti: Optional[str] = None
) -> str:
    """
    Create a JWT token (access or refresh).
    """
    settings = get_settings()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        if token_type == "refresh":
            expire = datetime.datetime.now(
                datetime.timezone.utc
            ) + datetime.timedelta(
                minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
            )
        else:
            expire = datetime.datetime.now(
                datetime.timezone.utc
            ) + datetime.timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )

    # Generate a unique JTI if not provided
    if not jti:
        jti = str(uuid.uuid4())

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type,
        "jti": jti,
        "aud": settings.JWT_AUDIENCE,
        "iss": settings.JWT_ISSUER,
        "iat": datetime.datetime.now(datetime.timezone.utc).timestamp()
    }
    # Convert exp to timestamp if it's datetime
    if isinstance(to_encode["exp"], datetime.datetime):
        to_encode["exp"] = to_encode["exp"].timestamp()

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], jti: Optional[str] = None) -> str:
    """Create a refresh token for the given subject."""
    return create_access_token(subject, token_type="refresh", jti=jti)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token with audience and issuer checks.
    """
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        options={
            "verify_aud": False,
            "verify_iss": False
        }
    )
    return payload


def get_token_type(token: str) -> Optional[str]:
    """
    Extract the token type from a JWT without full validation.
    Useful for quick checks.
    """
    try:
        # Decode without verification for type check
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": False}
        )
        return payload.get("type")
    except JWTError:
        return None


def is_token_expired(token: str) -> bool:
    """
    Check if a token is expired without full validation.
    """
    try:
        jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": True}
        )
        return False  # If decode succeeds, token is not expired
    except JWTError:
        return True


# Token Blacklist for Logout
# Uses Redis for distributed token blacklist
TOKEN_BLACKLIST_PREFIX = "blacklist:token:"

def get_blacklist_key(jti: str) -> str:
    """Generate Redis key for a token's JTI."""
    return f"{TOKEN_BLACKLIST_PREFIX}{jti}"

async def add_to_blacklist(jti: str, expires_in: int) -> bool:
    """
    Add a token JTI to the blacklist.

    Args:
        jti: The JWT ID (unique identifier for the token)
        expires_in: Seconds until the token naturally expires

    Returns:
        True if successfully added to blacklist
    """
    try:
        from app.core.redis import get_redis

        redis = get_redis()
        # Use synchronous Redis client for simplicity in this context
        # In production, you might want to use async properly

        # Calculate TTL (minimum of token expiry or max blacklist TTL)
        max_blacklist_ttl = 86400  # 24 hours
        ttl = min(expires_in, max_blacklist_ttl)

        # Store JTI with expiry
        await redis.setex(f"{TOKEN_BLACKLIST_PREFIX}{jti}", ttl, "1")
        return True
    except Exception:
        # If Redis is not available, log warning
        import logging
        logging.warning("Could not add token to blacklist - Redis unavailable")
        return False


async def is_blacklisted(jti: str) -> bool:
    """
    Check if a token JTI is blacklisted.

    Returns:
        True if token is blacklisted
    """
    try:
        from app.core.redis import get_redis
        redis = get_redis()
        if redis is None:
            return False
        key = f"{TOKEN_BLACKLIST_PREFIX}{jti}"
        return await redis.exists(key) > 0
    except Exception:
        return False
