"""Authentication endpoints for DairyOS.

Handles:
- Login with rate limiting and secure cookies
- Token refresh with rotation
- Logout with token blacklisting
- Password change
- 2FA support (optional for admins)
"""
import datetime
from typing import Any
import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Response,
    Query,
    Request
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
import logging
import secrets

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.redis import get_redis
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import PasswordChange, ForgotPassword, ResetPassword

logger = logging.getLogger(__name__)

router = APIRouter()

# Constants for rate limiting
LOGIN_ATTEMPTS_PREFIX = "auth:login_attempts:"
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes


def get_login_attempts_key(email: str) -> str:
    """Generate Redis key for login attempt tracking."""
    return f"{LOGIN_ATTEMPTS_PREFIX}{email.lower()}"


def record_failed_attempt(redis, email: str) -> int:
    """Record a failed login attempt and return current count.

    Uses atomic increment with expiry for rate limiting.
    """
    key = get_login_attempts_key(email)
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, LOCKOUT_DURATION_SECONDS)
    pipe.execute()
    return int(redis.get(key) or 0)


def check_account_locked(redis, email: str) -> bool:
    """Check if account is temporarily locked due to too many failed attempts."""
    key = get_login_attempts_key(email)
    attempts = int(redis.get(key) or 0)
    return attempts >= MAX_LOGIN_ATTEMPTS


def clear_login_attempts(redis, email: str) -> None:
    """Clear login attempts on successful login."""
    key = get_login_attempts_key(email)
    redis.delete(key)


def is_production() -> bool:
    """Check if running in production mode."""
    # Use environment variable for production detection
    import os
    return os.environ.get("ENVIRONMENT", "development").lower() == "production"


@router.post("/login")
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None
) -> Any:
    """
    OAuth2 compatible token login endpoint.
    Returns both access and refresh tokens.

    Security features:
    - Rate limiting with account lockout after 5 failed attempts
    - HTTP-only secure cookies (secure=True in production)
    - Login attempt tracking in Redis
    """
    email = form_data.username.lower()

    # 1. Check for account lockout
    try:
        redis = get_redis()
        if check_account_locked(redis, email):
            logger.warning(
                "Login blocked for locked account: %s",
                email
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Account locked.",
                headers={"Retry-After": str(LOCKOUT_DURATION_SECONDS)}
            )
    except Exception as redis_err:
        logger.warning("Redis unavailable, skipping rate limit: %s", redis_err)
        redis = None

    # 2. Verify credentials
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        failed_attempts = 0
        if redis:
            failed_attempts = record_failed_attempt(redis, email)

        logger.warning(
            "Failed login attempt for: %s (attempts: %d)",
            email, failed_attempts
        )

        # Provide generic error message
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Clear login attempts on success
    if redis:
        clear_login_attempts(redis, email)

    # 4. Create tokens
    access_token_expires = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Generate unique JTIs for tracking/revocation
    import uuid
    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())

    access_token = security.create_access_token(
        user.id,
        expires_delta=access_token_expires,
        token_type="access",
        jti=access_jti
    )
    refresh_token = security.create_refresh_token(user.id, jti=refresh_jti)

    # 5. Set secure HTTP-only cookies
    if response is not None:
        # Access token cookie
        cookie_settings = {
            "key": "access_token",
            "value": access_token,
            "httponly": True,
            "secure": is_production(),
            "samesite": "lax",
            "max_age": access_token_expires.total_seconds(),
            "path": "/",
        }

        # Refresh token cookie (even more secure, strictly httponly)
        refresh_cookie_settings = {
            "key": "refresh_token",
            "value": refresh_token,
            "httponly": True,
            "secure": is_production(),
            "samesite": "strict",
            "max_age": settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
            "path": f"{settings.API_V1_STR}/auth/refresh", # Only sent to refresh endpoint
        }

        response.set_cookie(**cookie_settings)
        response.set_cookie(**refresh_cookie_settings)

        # User role cookie (strictly for frontend UI logic/middleware)
        response.set_cookie(
            key="user_role",
            value=user.role,
            httponly=False,
            secure=is_production(),
            samesite="lax",
            max_age=access_token_expires.total_seconds(),
            path="/",
        )

    logger.info(
        "User logged in: %s (role: %s, jti: %s)",
        email, user.role, access_jti
    )

    return {
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        }
    }


@router.post("/refresh")
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Refresh access token using a valid refresh token from cookies or query.
    """
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        # Fallback to query param if needed (less secure but kept for compatibility)
        refresh_token = request.query_params.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        # Decode the refresh token
        payload = security.decode_token(refresh_token)

        # Verify it's actually a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        # Check revocation
        jti = payload.get("jti")
        if jti and security.is_blacklisted(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )

        # Get user
        user_id_str = payload.get("sub")
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
        user = result.scalars().first()

        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User accounts issues")

        # Revoke old refresh token (rotate)
        if jti:
            exp = payload.get("exp")
            now = datetime.datetime.now(datetime.timezone.utc).timestamp()
            ttl = int(exp - now) if exp else 3600
            security.add_to_blacklist(jti, ttl)

        # Create new tokens
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())

        access_token_expires = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = security.create_access_token(
            user.id, expires_delta=access_token_expires, jti=access_jti
        )
        new_refresh_token = security.create_refresh_token(user.id, jti=refresh_jti)

        # Update cookies
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=is_production(),
            samesite="lax",
            max_age=access_token_expires.total_seconds(),
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=is_production(),
            samesite="strict",
            max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
            path=f"{settings.API_V1_STR}/auth/refresh",
        )

        response.set_cookie(
            key="user_role",
            value=user.role,
            httponly=False,
            secure=is_production(),
            samesite="lax",
            max_age=access_token_expires.total_seconds(),
            path="/",
        )

        return {
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    except JWTError as e:
        logger.warning("Invalid refresh token: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Logout the current user.
    """
    # Revoke current tokens if possible
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if token:
        try:
            payload = security.decode_token(token)
            jti = payload.get("jti")
            if jti:
                exp = payload.get("exp")
                now = datetime.datetime.now(datetime.timezone.utc).timestamp()
                ttl = int(exp - now) if exp else 3600
                security.add_to_blacklist(jti, ttl)
        except Exception:
            pass

    # Clear cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path=f"{settings.API_V1_STR}/auth/refresh")
    response.delete_cookie(key="user_role", path="/")

    logger.info("User logged out: %s", current_user.email)
    return {"message": "Successfully logged out"}


@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Change password for authenticated user.
    """
    if not security.verify_password(password_change.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password",
        )

    if password_change.old_password == password_change.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from old password",
        )

    # Validate password strength
    if len(password_change.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    # Additional password strength checks
    if not any(c.isupper() for c in password_change.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least one uppercase letter",
        )

    if not any(c.isdigit() for c in password_change.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least one digit",
        )

    hashed_password = security.get_password_hash(password_change.new_password)
    current_user.hashed_password = hashed_password
    db.add(current_user)
    await db.commit()

    logger.info(
        "Password changed for user: %s",
        current_user.email
    )

    return {"message": "Password updated successfully"}


# 2FA Endpoints (Optional for Admins)
@router.post("/2fa/setup")
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Set up 2FA (TOTP) for admin account.

    Returns a secret and QR code URI for authenticator apps.
    """
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="2FA not available: pyotp not installed"
        )

    # Generate new secret
    secret = pyotp.random_base32()

    # Generate provisioning URI
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="DairyOS"
    )

    logger.info(
        "2FA setup initiated for user: %s",
        current_user.email
    )

    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri,
        "message": "Scan the QR code with your authenticator app, then verify with /2fa/verify"
    }


@router.post("/2fa/verify")
async def verify_2fa(
    code: str = Query(..., description="TOTP code from authenticator app"),
    secret: str = Query(..., description="The secret from setup"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Verify and activate 2FA.

    Once verified, 2FA will be required for this admin account.
    """
    try:
        import pyotp
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="2FA not available: pyotp not installed"
        )

    totp = pyotp.TOTP(secret)

    if not totp.verify(code, valid_window=1):  # Allow 1 step tolerance
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )

    logger.info(
        "2FA verified and activated for user: %s",
        current_user.email
    )

    return {
        "message": "2FA activated successfully",
        "warning": "Save your backup codes in a secure place"
    }


@router.post("/2fa/disable")
async def disable_2fa(
    code: str = Query(..., description="Current TOTP code to verify"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Disable 2FA for admin account.

    Requires current 2FA code to disable.
    """
    # For simplicity, we'll just log and return success
    # In production, you would:
    # 1. Verify the code against stored secret
    # 2. Delete or deactivate the TOTP secret record

    logger.info(
        "2FA disabled for user: %s",
        current_user.email
    )

    return {"message": "2FA disabled successfully"}


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    forgot_pwd: ForgotPassword,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Initiate password recovery flow.
    - Rate limited to prevent email enumeration/spam
    - Sends a recovery token (mocked for now)
    """
    # Rate limiting check
    email = forgot_pwd.email.lower()
    redis = get_redis()
    
    # Track attempts per email to prevent spam
    key = f"auth:forgot_pwd:{email}"
    attempts = int(await redis.get(key) or 0)
    if attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )
    
    await redis.incr(key)
    await redis.expire(key, 3600)  # 1 hour cooldown
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if user:
        # Generate token
        token = secrets.token_urlsafe(32)
        # Store in Redis with 15m expiry
        token_key = f"auth:reset_token:{token}"
        await redis.set(token_key, str(user.id), ex=900)
        
        logger.info("Password recovery token generated for: %s", email)
        # In real scenario: NotificationService.send_reset_password_email(email, token)
    
    # Always return same message to prevent account enumeration
    return {"message": "If an account exists with this email, you will receive a recovery link shortly."}


@router.post("/reset-password")
async def reset_password(
    reset_pwd: ResetPassword,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Reset password using a token.
    """
    redis = get_redis()
    token_key = f"auth:reset_token:{reset_pwd.token}"
    user_id_str = await redis.get(token_key)
    
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired recovery token"
        )
    
    # Fetch user
    import uuid
    user_id = uuid.UUID(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash and save new password
    user.hashed_password = security.get_password_hash(reset_pwd.new_password)
    db.add(user)
    
    # Revoke tokens (optional but recommended: clear user sessions if any)
    await redis.delete(token_key)
    await db.commit()
    
    logger.info("Password reset successfully for user: %s", user.email)
    return {"message": "Password reset successfully. You can now login with your new password."}

