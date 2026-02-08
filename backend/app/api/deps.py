from uuid import UUID
from typing import Optional
from datetime import date, timedelta
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def is_date_locked(consumption_date: date) -> bool:
    """
    Check if a consumption date is locked for editing.
    Entries older than 7 days are locked.

    Args:
        consumption_date: The date of the consumption entry

    Returns:
        True if the entry is locked (cannot be edited)
    """
    lock_threshold = date.today() - timedelta(days=7)
    return consumption_date <= lock_threshold


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    request: Request = None
) -> User:
    """
    Get the current authenticated user from the JWT token.
    """
    try:
        # Support reading from secure cookie
        if request is not None:
            cookie_token = request.cookies.get("access_token")
            if cookie_token:
                token = cookie_token

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Decode and validate the token using the improved security helper
        payload = security.decode_token(token)

        # Check if token is blacklisted
        jti = payload.get("jti")
        if jti and security.is_blacklisted(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify it's an access token, not a refresh token
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_data = payload.get("sub")
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == UUID(token_data)))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the current user is an admin.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user


def get_current_active_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the current user is a superadmin.
    """
    if current_user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Requires superadmin privileges"
        )
    return current_user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the current user is an active user (any role).
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    request: Request = None
) -> Optional[User]:
    """
    Optionally get the current user if authenticated.
    Returns None if not authenticated.
    """
    token = None

    auth_header = request.headers.get("Authorization") if request else None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token and request:
        token = request.cookies.get("access_token")

    if not token:
        return None

    try:
        return await get_current_user(db, token, request)
    except HTTPException:
        return None

