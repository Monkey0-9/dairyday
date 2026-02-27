from celery import Celery
from app.core.config import settings
import redis
from celery.schedules import crontab

# Configure Celery; fall back to in-memory broker/backend if Redis unavailable
broker_url = settings.REDIS_URL
backend_url = settings.REDIS_URL
try:
    r = redis.Redis.from_url(broker_url)
    r.ping()
except Exception:
    broker_url = "memory://"
    backend_url = "cache+memory://"


celery_app = Celery("dairyday", broker=broker_url, backend=backend_url)

# Centralize task imports to prevent circularity and ensure one source of truth
celery_app.autodiscover_tasks(["app.workers"])

celery_app.conf.beat_schedule = {
    "reconcile-payments-every-hour": {
        "task": "app.workers.tasks.reconcile_payments_task",
        "schedule": crontab(minute=0),  # Every hour
    },
    "backup-database-daily": {
        "task": "app.workers.tasks.backup_database_task",
        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

celery_app.conf.task_routes = {
    "generate_and_upload_pdf": {"queue": "high_priority"},
    "archive_old_consumption": {"queue": "low_priority"},
}
