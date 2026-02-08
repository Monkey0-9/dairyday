
from typing import Any, List
import logging
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.api import deps
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get current user."""
    return current_user

@router.get("/", response_model=List[UserSchema])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Retrieve all users with pagination."""
    try:
        logger.info(f"Fetching users: skip={skip}, limit={limit}")
        result = await db.execute(select(User).offset(skip).limit(limit))
        users = result.scalars().all()
        logger.info(f"Successfully retrieved {len(users)} users")
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve users: {str(e)}"
        )

@router.post("/", response_model=UserSchema)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Create a new user/customer."""
    try:
        logger.info(f"Creating new user: email={user_in.email}, name={user_in.name}")

        # Check for existing user
        result = await db.execute(select(User).where(User.email == user_in.email))
        user = result.scalars().first()
        if user:
            logger.warning(f"User creation failed: Email already exists - {user_in.email}")
            raise HTTPException(
                status_code=400,
                detail="A user with this email already exists in the system.",
            )

        # Create new user
        db_user = User(
            name=user_in.name,
            email=user_in.email,
            phone=user_in.phone,
            role=user_in.role,
            price_per_liter=user_in.price_per_liter,
            is_active=user_in.is_active,
            hashed_password=security.get_password_hash(user_in.password),
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        logger.info(f"Successfully created user: id={db_user.id}, email={db_user.email}")
        return db_user

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create user: {str(e)}"
        )

@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    obj_data = jsonable_encoder(user)
    if isinstance(user_in, dict):
        update_data = user_in
    else:
        update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password

    for field in obj_data:
        if field in update_data:
            setattr(user, field, update_data[field])

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=UserSchema)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    # Soft delete
    user.is_active = False
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
