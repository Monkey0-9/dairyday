import asyncio
from typing import Optional
from redis.asyncio import Redis
from app.core.config import settings

_client: Optional[Redis] = None

def get_redis() -> Redis:
    global _client
    if _client is None:
        _client = Redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    return _client
