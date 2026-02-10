import logging
from typing import Optional
from redis import Redis
from app.core.config import settings

logger = logging.getLogger(__name__)
_client: Optional[Redis] = None
_checked: bool = False


def get_redis() -> Optional[Redis]:
    """Get Redis client, returning None if Redis is not available."""
    global _client, _checked
    if _checked:
        return _client
    _checked = True
    try:
        _client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=0.5,
            socket_connect_timeout=0.5,
        )
        # Test connection
        _client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        _client = None
    return _client
