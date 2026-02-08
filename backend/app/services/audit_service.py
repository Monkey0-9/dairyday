
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from typing import Any, Optional
import uuid

class AuditService:
    """
    Service for creating audit records.
    """
    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        target_type: str,
        user_id: Optional[uuid.UUID] = None,
        target_id: Optional[str] = None,
        details: Optional[Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_entry)
        # Note: We rely on the caller to commit or flush
        await db.flush()
        return audit_entry
