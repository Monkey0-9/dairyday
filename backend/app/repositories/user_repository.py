"""
User Repository for DairyDay.
Elite Standard: Centralized database logic for User data.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Fetch a user by its ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get_active_users(self) -> List[User]:
        """Fetch all active users with role 'USER'."""
        result = await self.db.execute(
            select(User).where(and_(User.role == "USER", User.is_active))
        )
        return result.scalars().all()

    async def create(self, user: User) -> User:
        """Persist a new user."""
        self.db.add(user)
        await self.db.flush()
        return user

    async def update(self, user: User) -> User:
        """Sync changes to an existing user."""
        self.db.add(user)
        await self.db.flush()
        return user
