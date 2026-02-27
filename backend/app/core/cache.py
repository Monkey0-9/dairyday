import json
import logging
from functools import wraps
from typing import Callable, Optional
from fastapi import Request
from pydantic import BaseModel

from app.core.redis import get_redis

logger = logging.getLogger("app.cache")


def cache_response(expire: int = 60, key_prefix: str = "api_cache"):
    """
    Cache the JSON response of a FastAPI endpoint using Redis.
    Designed for GET requests to offload DB load for reporting.
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to grab the Request object from kwargs or args to build a cache key
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # If no request object found, bypass cache
            if not request:
                return await func(*args, **kwargs)

            # Build a unique cache key based on URL and query params
            user_id = getattr(request.state, "user_id", "anonymous")
            cache_key = f"{key_prefix}:{user_id}:{request.url.path}?{request.url.query}"

            redis = await get_redis()
            if redis:
                try:
                    cached_data = await redis.get(cache_key)
                    if cached_data:
                        logger.debug(f"Cache HIT for {cache_key}")
                        data = json.loads(cached_data)
                        return data
                except Exception as e:
                    logger.warning(f"Failed to read from cache: {e}")

            logger.debug(f"Cache MISS for {cache_key}")
            # Execute original function
            response_data = await func(*args, **kwargs)

            # Convert to dict if pydantic model for caching
            data_to_cache = response_data
            if isinstance(response_data, BaseModel):
                data_to_cache = response_data.model_dump(mode="json")
            elif isinstance(response_data, list):
                data_to_cache = [
                    (
                        item.model_dump(mode="json")
                        if isinstance(item, BaseModel)
                        else item
                    )
                    for item in response_data
                ]

            # Cache the result async
            if redis:
                try:
                    await redis.setex(cache_key, expire, json.dumps(data_to_cache))
                except Exception as e:
                    logger.warning(f"Failed to write to cache: {e}")

            return response_data

        return wrapper

    return decorator
