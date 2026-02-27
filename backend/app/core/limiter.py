import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key.
    IP-based for anonymous, UserID-based for authenticated.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"ratelimit:user:{user_id}"
    return get_remote_address(request)


def _build_storage_uri() -> str | None:
    """Try Redis, fall back to in-memory."""
    try:
        redis_url = settings.REDIS_URL
        if redis_url and "redis" in redis_url:
            # Check if Redis is actually available
            import socket
            # Parse host and port from redis URL
            import re
            match = re.search(r'redis://([^:]+):(\d+)', redis_url)
            if match:
                host, port = match.groups()
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((host, int(port)))
                sock.close()
                if result != 0:
                    logger.info("Rate limiter: Redis unavailable, using in-memory storage")
                    return None
            return redis_url
    except Exception as e:
        logger.info(f"Rate limiter: using in-memory storage (Redis check failed: {e})")
    logger.info("Rate limiter: using in-memory storage")
    return None


limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=[settings.RATE_LIMIT],
    storage_uri=_build_storage_uri(),
)
