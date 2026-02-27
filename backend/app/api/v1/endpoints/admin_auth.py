from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import datetime
from sqlalchemy import select

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetRequest, RequestStatus
from app.schemas.password_reset import PasswordResetRequestResponse

router = APIRouter()


@router.get("/password-requests", response_model=List[PasswordResetRequestResponse])
async def list_password_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """List all password reset requests."""
    result = await db.execute(
        select(PasswordResetRequest, User.name, User.email, User.phone)
        .join(User, PasswordResetRequest.user_id == User.id)
        .order_by(PasswordResetRequest.created_at.desc())
    )
    requests = []
    for row in result.all():
        req, name, email, phone = row
        res = PasswordResetRequestResponse.model_validate(req)
        res.user_name = name
        res.user_email = email
        res.user_phone = phone
        requests.append(res)

    return requests


@router.post("/password-requests/{request_id}/approve")
async def approve_password_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Approve a password reset request."""
    import uuid

    req_id = uuid.UUID(request_id)
    result = await db.execute(
        select(PasswordResetRequest).where(PasswordResetRequest.id == req_id)
    )
    reset_req = result.scalars().first()

    if not reset_req:
        raise HTTPException(status_code=404, detail="Request not found")

    if reset_req.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=400, detail=f"Request is already {reset_req.status}"
        )

    # Find the user
    user_result = await db.execute(select(User).where(User.id == reset_req.user_id))
    user = user_result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Approval expires in 1 hour
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        hours=1
    )

    # Update request
    reset_req.status = RequestStatus.APPROVED
    reset_req.approved_at = datetime.datetime.now(datetime.timezone.utc)
    reset_req.admin_id = current_user.id
    reset_req.expires_at = expires_at

    db.add(reset_req)
    await db.commit()

    # Log approval
    print(
        f"\n[AUTH] Password Reset APPROVED for {user.email} "
        f"(By admin {current_user.email})\n"
    )

    return {"message": "Request approved. User can now reset their password."}


@router.post("/password-requests/{request_id}/reject")
async def reject_password_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Reject a password reset request."""
    import uuid

    req_id = uuid.UUID(request_id)
    result = await db.execute(
        select(PasswordResetRequest).where(PasswordResetRequest.id == req_id)
    )
    reset_req = result.scalars().first()

    if not reset_req:
        raise HTTPException(status_code=404, detail="Request not found")

    reset_req.status = RequestStatus.REJECTED
    reset_req.admin_id = current_user.id

    db.add(reset_req)
    await db.commit()

    return {"message": "Request rejected."}
