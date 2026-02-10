"""
Clear Redis cache for consumption grid
"""
import asyncio
import sys
import os

sys.path.append(os.getcwd())

async def clear_cache():
    from app.core.redis import get_redis
    
    print("Clearing Redis cache...")
    redis = get_redis()
    
    # Clear all consumption grid cache keys
    pattern = "grid:*"
    try:
        keys = await redis.keys(pattern)
        if keys:
            print(f"Found {len(keys)} cached keys: {keys}")
            for key in keys:
                await redis.delete(key)
            print("Cache cleared!")
        else:
            print("No cache keys found")
    except Exception as e:
        print(f"Error: {e}")
        print("Redis might not be running - this could be causing issues")


if __name__ == "__main__":
    asyncio.run(clear_cache())
