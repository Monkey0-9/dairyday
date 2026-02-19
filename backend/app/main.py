import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import secrets
import os
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.metrics import MetricsMiddleware, set_system_info
from app.init_db import init_models, create_initial_data
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.error_handler import GlobalErrorHandlerMiddleware

# Setup logging
setup_logging()

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
    )
    logging.info("Sentry initialized")


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key.
    Elite Standard: IP-based for anon, UserID-based for authenticated.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"ratelimit:user:{user_id}"
    return get_remote_address(request)


# Initialize rate limiter with optimized key function
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=[settings.RATE_LIMIT]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logging.info("Starting up DairyDay...")

    # Initialize database (try PostgreSQL first, fallback to SQLite)
    engine = await init_models()

    # Create initial data using the same engine
    await create_initial_data(engine)

    # Set system info metrics
    set_system_info(
        version="1.0.0",
        environment="development"
    )

    logging.info("DairyDay started successfully")

    yield

    # Shutdown
    logging.info("Shutting down DairyDay...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade Dairy Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Register Enterprise Middleware
# Error handler should be outermost to catch everything
app.add_middleware(GlobalErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)


# Security Headers & CSRF Middleware
@app.middleware("http")
async def add_security_headers_and_csrf(request: Request, call_next):
    # 1. CSRF Protection for non-safe methods when using cookies
    # Double-submit cookie pattern
    if (
        request.method not in ("GET", "HEAD", "OPTIONS", "TRACE")
        and not request.url.path.endswith("/auth/login")
    ):
        # Check if requested with cookie
        if (
            request.cookies.get("access_token")
            or request.cookies.get("refresh_token")
        ):
            csrf_token_cookie = request.cookies.get("csrf_token")
            csrf_token_header = request.headers.get("X-CSRF-Token")

            if not csrf_token_header or csrf_token_header != csrf_token_cookie:
                # Skip CSRF for mobile/bearer request (no cookies)
                # But if cookies are present, we enforce it.
                if request.cookies.get("access_token"):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token verification failed"}
                    )

    response = await call_next(request)

    # Set CSRF cookie if not present
    if not request.cookies.get("csrf_token"):
        response.set_cookie(
            "csrf_token",
            secrets.token_urlsafe(32),
            httponly=False,  # Must be readable by frontend to send back in header
            secure=settings.SENTRY_ENVIRONMENT == "production",
            samesite="lax",
            path="/"
        )

    # 2. Add Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    hsts = "max-age=31536000; includeSubDomains"
    response.headers["Strict-Transport-Security"] = hsts
    connect_sources = "'self' " + " ".join(settings.BACKEND_CORS_ORIGINS)
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        f"connect-src {connect_sources}"
    )
    response.headers["Content-Security-Policy"] = csp
    return response


# Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logging.error(f"Database error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database error occurred. Please try again later."
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


# CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Custom metrics middleware
app.add_middleware(MetricsMiddleware)


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount local uploads for static serving
uploads_dir = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Welcome to Dairy Management System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


# Temporary admin creation endpoint
@app.get("/create-admin")
async def create_admin_endpoint():
    """Manual trigger to ensure admin user exists."""
    try:
        from app.init_db import init_models, create_initial_data
        engine = await init_models()
        await create_initial_data(engine)
        return {"status": "success", "message": "Admin checking/creation sequence completed."}
    except Exception as e:
        logging.error(f"Manual admin creation failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "service": "dairy-os",
        "version": "1.0.0",
    }


# Readiness check endpoint
@app.get("/api/ready")
async def readiness_check():
    """Readiness check that verifies all dependencies are available."""
    checks = {
        "database": False,
        "redis": True,  # Redis is optional
    }

    # Check database
    try:
        from app.db.session import async_session
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")

    # Check Redis (optional, don't fail if unavailable)
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis is not None:
            await redis.ping()
            checks["redis"] = True
        else:
            checks["redis"] = True  # Redis not required for basic operation
    except Exception as e:
        logging.warning(f"Redis health check failed (optional): {e}")
        checks["redis"] = True  # Redis is optional

    all_healthy = checks["database"]  # Only database is required

    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
        }
    )


# Prometheus metrics (instrumentator handles /metrics)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# Startup event
@app.on_event("startup")
async def startup_event():
    logging.info(f"API Version: {settings.API_V1_STR}")
    logging.info(f"CORS Origins: {settings.BACKEND_CORS_ORIGINS}")

