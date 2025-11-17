from redis.asyncio import Redis

from core.config import settings


async def get_redis_client() -> Redis:
    return Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=0,
        socket_timeout=120,  # Increased from 30 to 120 seconds
        socket_connect_timeout=30,  # Connection timeout
        socket_keepalive=True,  # Enable keepalive
        socket_keepalive_options={},  # Keepalive options
        retry_on_timeout=True,  # Retry on timeout
        health_check_interval=30,  # Health check every 30 seconds
        decode_responses=True,
    )
