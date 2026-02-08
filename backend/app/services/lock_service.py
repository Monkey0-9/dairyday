from datetime import date, timedelta
from app.core.config import settings

class LockService:
    @staticmethod
    def get_lock_date() -> date:
        """Calculate the cut-off date for locking based on settings."""
        return date.today() - timedelta(days=settings.LOCK_DAYS)

    @staticmethod
    def is_date_locked(target_date: date) -> bool:
        """Check if a specific date is older than the lock window."""
        return target_date < LockService.get_lock_date()
