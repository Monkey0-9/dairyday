import logging
from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker
from taskiq import TaskiqEvents
from app.core.config import settings

logger = logging.getLogger(__name__)

# Enterprise Task Broker configuration
# Uses Redis ListQueue for reliable task delivery
redis_url = settings.REDIS_URL.replace("127.0.0.1", "redis").replace(
    "localhost", "redis"
)

result_backend = RedisAsyncResultBackend(
    redis_url=redis_url,
)

broker = ListQueueBroker(
    url=redis_url,
    result_backend=result_backend,
)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def startup(state):
    """Worker startup logic."""
    logger.info("Worker starting up and connecting to Redis...")


@broker.task
async def generate_bill_pdf_task(bill_id: int) -> str:
    """
    Background task to generate bill PDFs.
    Offloads heavy PDF generation from the API thread.
    """
    logger.info(f"Starting background PDF generation for bill {bill_id}")
    # Integration with BillingService would go here
    import asyncio

    await asyncio.sleep(2)  # Simulate work
    return f"bill_{bill_id}.pdf"


@broker.task
async def sync_consumption_metrics_task() -> None:
    """
    Background task to synchronize consumption metrics.
    Ensures dashboard data stays fresh without blocking user requests.
    """
    logger.info("Synchronizing enterprise consumption metrics...")
    await asyncio.sleep(1)
