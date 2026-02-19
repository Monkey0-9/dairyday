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

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)


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
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get the current authenticated user from the JWT token.
    Supports both internal tokens and Logto tokens.
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

        # 1. Try Logto validation first if it looks like a Logto token or as a fallback
        # In a real scenario, you might check the issuer header or have a separate path
        logto_payload = await security.verify_logto_token(token)
        
        if logto_payload:
            # Logto authenticated
            logto_sub = logto_payload.get("sub")
            if not logto_sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Logto token missing sub claim",
                )
            
            # Lookup user by logto_id
            result = await db.execute(select(User).where(User.logto_id == logto_sub))
            user = result.scalars().first()
            
            # Fallback: check by email if provided by Logto
            if not user and logto_payload.get("email"):
                result = await db.execute(select(User).where(User.email == logto_payload.get("email")))
                user = result.scalars().first()
                if user:
                    # Link account
                    user.logto_id = logto_sub
                    db.add(user)
                    await db.commit()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found for Logto identity")
            
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")
            
            return user

        # 2. Fallback to existing local JWT validation
        payload = security.decode_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if token is blacklisted
        jti = payload.get("jti")
        if jti and await security.is_blacklisted(jti):
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

        # Validate local sub as UUID
        try:
            user_id = UUID(token_data)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user ID format in token",
            )

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

    except JWTError as e:
        print(f"DEBUG: JWT Validation Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        import logging
        logging.error(f"Authentication Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication process failed"
        )

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


def get_current_active_billing_manager(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the current user is an admin or a billing admin.
    """
    if current_user.role not in ["ADMIN", "BILLING_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires billing management privileges"
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
        return await get_current_user(request=request, db=db, token=token)
    except HTTPException:
        return None

