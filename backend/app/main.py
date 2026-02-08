import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import secrets
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

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logging.info("Starting up DairyOS...")

    # Initialize database (try PostgreSQL first, fallback to SQLite)
    engine = await init_models()

    # Create initial data using the same engine
    await create_initial_data(engine)

    # Set system info metrics
    set_system_info(
        version="1.0.0",
        environment="development"
    )

    logging.info("DairyOS started successfully")

    yield

    # Shutdown
    logging.info("Shutting down DairyOS...")


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
    if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
        # Check if requested with cookie
        if request.cookies.get("access_token") or request.cookies.get("refresh_token"):
            csrf_token_cookie = request.cookies.get("csrf_token")
            csrf_token_header = request.headers.get("X-CSRF-Token")

            if not csrf_token_header or csrf_token_header != csrf_token_cookie:
                # We skip CSRF for now if it's a mobile/bearer request (no cookies)
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
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self' http://localhost:8000"
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
    logging.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred."},
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Custom metrics middleware
app.add_middleware(MetricsMiddleware)


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Welcome to Dairy Management System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


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
        "redis": False,
    }

    # Check database
    try:
        from app.db.session import async_session
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")

    # Check Redis
    try:
        from app.core.redis import get_redis
        redis = get_redis()
        redis.ping()
        checks["redis"] = True
    except Exception as e:
        logging.error(f"Redis health check failed: {e}")

    all_healthy = all(checks.values())

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

