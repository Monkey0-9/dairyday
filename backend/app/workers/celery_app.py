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

celery_app.conf.beat_schedule = {
    "reconcile-payments-every-hour": {
        "task": "app.workers.celery_app.reconcile_payments_task",
        "schedule": crontab(minute=0), # Every hour
    },
    "backup-database-daily": {
        "task": "app.workers.celery_app.backup_database_task",
        "schedule": crontab(hour=2, minute=0), # Daily at 2 AM
    },
}

@celery_app.task
def generate_invoice_task(bill_id: str):
    # Import inside to avoid early async engine issues
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models.bill import Bill
    from app.models.user import User
    from app.models.consumption import Consumption
    from sqlalchemy import select, and_
    from calendar import monthrange
    import datetime
    from app.services.pdf_generator import generate_invoice_pdf
    from app.services.s3_uploader import upload_file_to_s3
    from app.core.config import settings as cfg
    import asyncio
    import uuid

    engine = create_async_engine(cfg.SQLALCHEMY_DATABASE_URI, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _run():
        async with async_session() as db:
            result = await db.execute(select(Bill).where(Bill.id == uuid.UUID(bill_id)))
            bill = result.scalars().first()
            if not bill:
                return
            user_result = await db.execute(select(User).where(User.id == bill.user_id))
            user = user_result.scalars().first()
            year, month_num = map(int, bill.month.split("-"))
            start_date = datetime.date(year, month_num, 1)
            _, last_day = monthrange(year, month_num)
            end_date = datetime.date(year, month_num, last_day)
            consumption_result = await db.execute(
                select(Consumption).where(
                    and_(Consumption.user_id == user.id, Consumption.date >= start_date, Consumption.date <= end_date)
                ).order_by(Consumption.date)
            )
            consumptions = consumption_result.scalars().all()
            pdf_buffer = generate_invoice_pdf(user, bill, consumptions)
            file_name = f"invoices/{bill.month}/{user.id}.pdf"
            bucket_name = cfg.AWS_BUCKET_NAME or "dairy-invoices-dev"
            upload_file_to_s3(pdf_buffer, bucket_name, file_name)
            bill.pdf_url = file_name
            db.add(bill)
            await db.commit()

    asyncio.run(_run())


@celery_app.task
def reconcile_payments_task():
    from app.services.reconciliation import reconcile_payments
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings as cfg
    import asyncio

    engine = create_async_engine(cfg.SQLALCHEMY_DATABASE_URI, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _run():
        async with async_session() as db:
            await reconcile_payments(db)
    
    asyncio.run(_run())


@celery_app.task
def backup_database_task():
    from scripts.backup_db import backup_database
    try:
        backup_database()
    except Exception as e:
        print(f"Backup task failed: {e}")
        # Ideally setup alert here
