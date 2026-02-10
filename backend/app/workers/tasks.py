"""Celery tasks for DairyOS background jobs."""

import io
import logging
from typing import Any, Dict
from datetime import date, datetime

import anyio
from celery.exceptions import MaxRetriesExceededError
from dateutil.relativedelta import relativedelta
from sqlalchemy import select, update

from app.workers.celery_app import celery_app
from app.db.session import async_session
from app.services.pdf_generator import generate_invoice_pdf
from app.services.s3_uploader import upload_file_to_s3, generate_presigned_url, upload_json_to_s3
from app.models.bill import Bill
from app.models.user import User
from app.models.consumption import Consumption
from app.models.consumption_archive import ConsumptionArchive
from app.models.consumption_audit import ConsumptionAudit

logger = logging.getLogger(__name__)


def calculate_month_range(month: str):
    """Calculate month range - imported here to avoid circular imports."""
    import calendar
    from datetime import date
    year, mon = map(int, month.split("-"))
    last = calendar.monthrange(year, mon)[1]
    return date(year, mon, 1), date(year, mon, last)


@celery_app.task(
    bind=True,
    name="generate_and_upload_pdf",
    acks_late=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_and_upload_pdf(self, bill_id: str) -> Dict[str, Any]:
    """Generate PDF invoice and upload to S3."""
    async def _do() -> Dict[str, Any]:
        async with async_session() as session:
            # Fetch bill
            bill_result = await session.execute(
                select(Bill).where(Bill.id == bill_id)
            )
            bill = bill_result.scalars().first()

            if not bill:
                logger.warning("Bill not found: %s", bill_id)
                return {"ok": False, "reason": "bill_not_found"}

            # Fetch user
            user_result = await session.execute(
                select(User).where(User.id == bill.user_id)
            )
            user = user_result.scalars().first()

            if not user:
                logger.warning("User not found for bill: %s", bill_id)
                return {"ok": False, "reason": "user_not_found"}

            # Fetch consumption for the month
            start_date, end_date = calculate_month_range(bill.month)
            consumption_result = await session.execute(
                select(Consumption)
                .where(
                    Consumption.user_id == bill.user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
                .order_by(Consumption.date)
            )
            consumptions = consumption_result.scalars().all()

            # Generate PDF
            pdf_buffer = generate_invoice_pdf(user, bill, consumptions)

            if not isinstance(pdf_buffer, io.BytesIO):
                logger.error("PDF generator returned invalid type: %s", type(pdf_buffer))
                raise ValueError("PDF generator must return BytesIO")

            # Upload to S3
            file_name = f"invoices/{bill.month}/{bill.user_id}.pdf"
            bucket_name = "dairyday-bills"

            upload_file_to_s3(pdf_buffer, bucket_name, file_name)

            # Generate presigned URL for download (expires in 1 hour)
            presigned_url = generate_presigned_url(bucket_name, file_name, expiration=3600)

            # Update bill with PDF URL
            stmt = (
                update(Bill)
                .where(Bill.id == bill_id)
                .values(
                    pdf_url=presigned_url,
                    updated_at=anyio.lowlevel.current_time()
                )
            )
            await session.execute(stmt)
            await session.commit()

            logger.info("PDF generated and uploaded for bill %s", bill_id)

            return {
                "ok": True,
                "bill_id": bill_id,
                "pdf_url": presigned_url,
                "s3_key": file_name
            }

    try:
        result = anyio.run(_do)
        return result
    except Exception as exc:
        logger.exception("PDF task failed for bill %s: %s", bill_id, exc)

        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error("Max retries exceeded for bill %s", bill_id)
            return {
                "ok": False,
                "reason": "max_retries_exceeded",
                "error": str(exc)
            }


@celery_app.task(name="generate_all_bills_pdf")
def generate_all_bills_pdf(month: str) -> Dict[str, Any]:
    """Generate PDFs for all bills of a month."""
    async def _do() -> Dict[str, Any]:
        async with async_session() as session:
            bills_result = await session.execute(
                select(Bill).where(Bill.month == month, Bill.status == "UNPAID")
            )
            bills = bills_result.scalars().all()

            results = {"total": len(bills), "success": 0, "failed": 0, "errors": []}

            for bill in bills:
                try:
                    generate_and_upload_pdf.delay(str(bill.id))
                    results["success"] += 1
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({"bill_id": str(bill.id), "error": str(e)})
                    logger.error("Failed to enqueue PDF for bill %s: %s", bill.id, e)

            return results

    try:
        return anyio.run(_do)
    except Exception as exc:
        logger.exception("Batch PDF generation failed for month %s: %s", month, exc)
        return {"ok": False, "reason": "batch_failed", "error": str(exc)}


@celery_app.task(name="cleanup_expired_urls")
def cleanup_expired_urls() -> Dict[str, Any]:
    """Cleanup and regenerate expired PDF URLs."""
    logger.info("URL cleanup task executed")
    return {"ok": True, "message": "No action needed - presigned URLs generated on demand"}


@celery_app.task(
    bind=True,
    name="archive_old_consumption",
    acks_late=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def archive_old_consumption(self) -> Dict[str, Any]:
    """Archive consumption records older than 6 months to archive table and S3."""

    async def _do() -> Dict[str, Any]:
        cutoff_date = date.today() - relativedelta(months=6)

        async with async_session() as session:
            try:
                # Query unarchived consumption records older than 6 months
                result = await session.execute(
                    select(Consumption).where(
                        Consumption.date < cutoff_date,
                        not Consumption.is_archived
                    )
                )
                consumptions_to_archive = result.scalars().all()

                archived_count = 0
                errors = []

                for consumption in consumptions_to_archive:
                    try:
                        # Fetch related audit records for this consumption
                        audit_result = await session.execute(
                            select(ConsumptionAudit).where(
                                ConsumptionAudit.user_id == consumption.user_id,
                                ConsumptionAudit.date == consumption.date
                            )
                        )
                        audit_records = audit_result.scalars().all()

                        # Create archive payload with consumption and audit data
                        archive_payload = {
                            "consumption": {
                                "id": str(consumption.id),
                                "user_id": str(consumption.user_id),
                                "date": str(consumption.date),
                                "quantity": float(consumption.quantity),
                                "source": consumption.source,
                                "version": consumption.version,
                                "locked": consumption.locked,
                                "created_at": consumption.created_at.isoformat() if consumption.created_at else None,
                            },
                            "audit_records": [
                                {
                                    "id": str(audit.id),
                                    "admin_id": str(audit.admin_id),
                                    "old_quantity": float(audit.old_quantity) if audit.old_quantity else None,
                                    "new_quantity": float(audit.new_quantity),
                                    "created_at": audit.created_at.isoformat() if audit.created_at else None,
                                    "source": audit.source,
                                    "version": audit.version,
                                    "note": audit.note,
                                }
                                for audit in audit_records
                            ]
                        }

                        # Create archive record
                        archive_record = ConsumptionArchive(
                            original_consumption_id=consumption.id,
                            user_id=consumption.user_id,
                            date=consumption.date,
                            quantity=consumption.quantity,
                            source=consumption.source,
                            version=consumption.version,
                            archived_payload=archive_payload
                        )
                        session.add(archive_record)

                        # Mark original consumption as archived
                        consumption.is_archived = True
                        consumption.archived_at = datetime.utcnow()
                        session.add(consumption)

                        # Upload to S3 for long-term storage
                        try:
                            s3_key = f"archives/consumption/{consumption.user_id}/{consumption.date}.json"
                            upload_json_to_s3(archive_payload, s3_key)
                            logger.info(f"Uploaded consumption archive to S3: {s3_key}")
                        except Exception as s3_error:
                            logger.warning(f"Failed to upload to S3: {s3_error}")
                            # Don't fail the archive process, just log the error
                            errors.append(f"S3 upload failed for {consumption.id}: {s3_error}")

                        archived_count += 1

                    except Exception as record_error:
                        logger.error(f"Failed to archive consumption {consumption.id}: {record_error}")
                        errors.append(f"Archive failed for {consumption.id}: {record_error}")

                # Commit all changes
                await session.commit()

                logger.info(f"Successfully archived {archived_count} consumption records")

                return {
                    "ok": True,
                    "archived_count": archived_count,
                    "cutoff_date": str(cutoff_date),
                    "errors": errors[:10]  # Limit error output
                }

            except Exception as e:
                await session.rollback()
                logger.exception("Archive consumption task failed")
                raise e

    try:
        return anyio.run(_do)
    except Exception as exc:
        logger.exception("Archive consumption task failed")

        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error("Max retries exceeded for archive consumption task")
            return {
                "ok": False,
                "reason": "max_retries_exceeded",
                "error": str(exc)
            }

