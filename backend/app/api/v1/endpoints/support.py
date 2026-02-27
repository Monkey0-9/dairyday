from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.support import SupportTicket
from app.schemas import support as schemas

router = APIRouter()


@router.post("/", response_model=schemas.SupportTicket)
async def create_support_ticket(
    ticket_in: schemas.SupportTicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(deps.get_optional_current_user),
) -> Any:
    """
    Create a new support ticket.
    Authenticated users will have their user_id linked.
    """
    ticket = SupportTicket(
        name=ticket_in.name,
        email=ticket_in.email,
        subject=ticket_in.subject,
        message=ticket_in.message,
        user_id=current_user.id if current_user else None,
        status="OPEN",
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/", response_model=List[schemas.SupportTicket])
async def get_my_tickets(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get tickets submitted by the current user.
    """
    query = (
        select(SupportTicket)
        .where(SupportTicket.user_id == current_user.id)
        .order_by(desc(SupportTicket.created_at))
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/admin", response_model=List[schemas.SupportTicket])
async def get_all_tickets_admin(
    status: str = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Admin: Get all support tickets.
    """
    query = select(SupportTicket).order_by(desc(SupportTicket.created_at))

    if status:
        query = query.where(SupportTicket.status == status)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
