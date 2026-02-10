import logging
import json
from typing import Any, List
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.models.consumption import Consumption
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.core.redis import get_redis

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
    month: str | None = None,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Retrieve all users with pagination and monthly consumption."""
    try:
        msg = f"Fetching users: skip={skip}, limit={limit}, month={month}"
        logger.info(msg)

        # Try Cache
        redis = get_redis()
        cache_key = f"users_list:{month}:{skip}:{limit}"
        if redis:
            cached = await redis.get(cache_key)
            if cached:
                logger.info("Returning cached users list")
                return json.loads(cached)

        # Determine date range (Start of month -> Start of NEXT month)
        if month:
            year, month_num = map(int, month.split("-"))
            start_date = date(year, month_num, 1)
            # Get first day of next month safely
            if month_num == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month_num + 1, 1)
        else:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1)
            else:
                end_date = date(today.year, today.month + 1, 1)

        # Single query with left join and aggregation (STRICT RANGE)
        query = (
            select(
                User,
                func.coalesce(func.sum(Consumption.quantity), 0).label(
                    "month_liters"
                )
            )
            .outerjoin(
                Consumption,
                and_(
                    Consumption.user_id == User.id,
                    Consumption.date >= start_date,
                    Consumption.date < end_date
                )
            )
            .group_by(User.id)
            .offset(skip)
            .limit(limit)
        )
        
        result = await db.execute(query)
        rows = result.all()
        
        enriched_users = []
        for user, month_liters in rows:
            user_data = UserSchema.model_validate(user)
            user_data.total_liters = month_liters or 0
            enriched_users.append(user_data)

        logger.info(f"Successfully retrieved {len(enriched_users)} users")

        # Save to Cache
        if redis:
            await redis.set(
                cache_key,
                json.dumps([u.model_dump() for u in enriched_users]),
                ex=300  # 5 minutes TTL
            )

        return enriched_users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve users: {str(e)}"
        ) from e


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Create a new user/customer."""
    try:
        msg = f"Creating new user: email={user_in.email}, name={user_in.name}"
        logger.info(msg)

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
