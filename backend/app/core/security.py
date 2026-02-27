import datetime
import uuid
import asyncio
import httpx
import json
import logging
from typing import Any, Union, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import get_logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = get_logger(__name__)
# Algorithm selection via settings
ALGORITHM = settings.ALGORITHM
LOGTO_ALGORITHM = settings.LOGTO_ALGORITHM


# Token expiry via settings
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
TOKEN_BLACKLIST_PREFIX = "token:blacklist:"
USER_SESSIONS_PREFIX = "sessions:user:"


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[datetime.timedelta] = None,
    token_type: str = "access",
    jti: Optional[str] = None,
    role: Optional[str] = None,
) -> str:
    """Create a new access or refresh token."""
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    elif token_type == "access":
        expire = now + datetime.timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    else:
        expire = now + datetime.timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type,
        "jti": jti or str(uuid.uuid4()),
    }
    if role:
        to_encode["role"] = role

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
    """Decode and verify a token."""
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None


# Global JWKS Cache (Singleton Pattern)
_JWKS_CACHE = None
_JWKS_CACHE_EXPIRY = None
_JWKS_LOCK = asyncio.Lock()


async def get_jwks(jwks_uri: str) -> Optional[dict]:
    """
    Get JWKS with in-memory caching and thread-safe loading.
    Elite Standard: Zero-latency auth.
    """
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRY

    # 1. Return cached if valid (24h TTL)
    now = datetime.datetime.now(datetime.timezone.utc)
    if _JWKS_CACHE and _JWKS_CACHE_EXPIRY and now < _JWKS_CACHE_EXPIRY:
        return _JWKS_CACHE

    # 2. Refresh cache with lock
    async with _JWKS_LOCK:
        # Re-check inside lock for double-check pattern
        if _JWKS_CACHE and _JWKS_CACHE_EXPIRY and now < _JWKS_CACHE_EXPIRY:
            return _JWKS_CACHE

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_uri, timeout=5.0)
                response.raise_for_status()
                _JWKS_CACHE = response.json()
                # Cache for 24 hours
                _JWKS_CACHE_EXPIRY = now + datetime.timedelta(hours=24)
                logging.info("JWKS Cache Refreshed successfully")
                return _JWKS_CACHE
        except Exception as e:
            logging.error(f"Error fetching JWKS: {str(e)}")
            return None


async def verify_logto_token(token: str) -> Optional[dict]:
    """Verify a Logto ID Token or Access Token."""

    if not settings.LOGTO_JWKS_URI:
        return None

    try:
        jwks = await get_jwks(settings.LOGTO_JWKS_URI)
        if not jwks:
            return None

        # Verify against all keys in JWKS
        decoded = jwt.decode(
            token, jwks, algorithms=[settings.LOGTO_ALGORITHM]
        )
        return decoded
    except JWTError as e:
        logger.warning("Logto Token verification failed: %s", str(e))
        return None


async def blacklist_token(jti: str, expires_delta: datetime.timedelta):
    """
    Add a token JTI to the blacklist in Redis.
    """
    try:
        from app.core.redis import get_redis

        redis = await get_redis()
        if redis is None:
            return False
        key = f"{TOKEN_BLACKLIST_PREFIX}{jti}"
        await redis.setex(key, int(expires_delta.total_seconds()), "1")
        return True
    except Exception as e:
        logging.error(f"Error blacklisting token: {str(e)}")
        return False


async def is_blacklisted(jti: str) -> bool:
    """
    Check if a token JTI is blacklisted.
    """
    try:
        from app.core.redis import get_redis

        redis = await get_redis()
        if redis is None:
            return False
        key = f"{TOKEN_BLACKLIST_PREFIX}{jti}"
        return await redis.exists(key) > 0
    except Exception:
        return False


def get_token_jti(token: str) -> Optional[str]:
    """Extract JTI from token without verification."""
    try:
        decoded = jwt.get_unverified_claims(token)
        return decoded.get("jti")
    except Exception:
        return None

async def record_session(user_id: str, jti: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
    """Record an active session for a user in Redis."""
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis is None:
            return False
            
        key = f"{USER_SESSIONS_PREFIX}{user_id}"
        session_data = {
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.datetime.now(
                datetime.timezone.utc
            ).isoformat()
        }
        await redis.hset(key, jti, json.dumps(session_data))
        # Keep active sessions valid for the refresh token lifetime
        await redis.expire(
            key, settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
        )
        return True
    except Exception as e:
        logging.error(f"Error recording session: {str(e)}")
        return False

async def get_active_sessions(user_id: str) -> list[dict]:
    """Retrieve all active sessions for a user."""
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis is None:
            return []
            
        key = f"{USER_SESSIONS_PREFIX}{user_id}"
        sessions_map = await redis.hgetall(key)
        
        active_sessions = []
        for jti, data_str in sessions_map.items():
            # Quick check if it's already in the blacklist
            if not await is_blacklisted(jti):
                try:
                    data = json.loads(data_str)
                    data["jti"] = jti
                    active_sessions.append(data)
                except Exception:
                    pass
            else:
                # Cleanup revoked but hanging jti
                await redis.hdel(key, jti)
        
        return active_sessions
    except Exception as e:
        logger.error("Error retrieving sessions: %s", str(e))
        return []

async def remove_session(user_id: str, jti: str):
    """Remove a session from the user's active list."""
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis is None:
            return False
            
        key = f"{USER_SESSIONS_PREFIX}{user_id}"
        await redis.hdel(key, jti)
        return True
    except Exception as e:
        logging.error(f"Error removing session: {str(e)}")
        return False
