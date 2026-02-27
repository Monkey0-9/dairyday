import logging
import os
import secrets
import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.limiter import limiter
from app.core.metrics import MetricsMiddleware, set_system_info
from app.init_db import init_models, create_initial_data
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.error_handler import GlobalErrorHandlerMiddleware

# Setup logging
setup_logging(json_format=False)

# Initialize Sentry
if settings.SENTRY_DSN:
    logging.info("Sentry DSN found, initializing Sentry integration...")
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release="dairy-os@1.0.0",
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logging.info("Starting up DairyDay...")

    # Initialize database
    engine = await init_models()

    # Create initial data
    await create_initial_data(engine)

    # Set system info metrics
    set_system_info(
        version="1.0.0",
        environment=settings.SENTRY_ENVIRONMENT or "development"
    )

    logging.info("DairyDay started successfully")
    yield
    logging.info("Shutting down DairyDay...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade Dairy Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Rate limiter setup (falls back to in-memory when Redis unavailable)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware (Order: ErrorHandler -> Logging -> Metrics)
app.add_middleware(GlobalErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Pre-compute static security headers and CSP at startup (avoid rebuilding per-request)
_IS_TESTING = settings.SENTRY_ENVIRONMENT == "testing"
_IS_PRODUCTION = settings.SENTRY_ENVIRONMENT == "production"
_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
_CSRF_SKIP_SUFFIXES = ("/auth/login", "/auth/refresh", "/webhooks/razorpay", "/openapi.json")
_origins_str = " ".join(settings.BACKEND_CORS_ORIGINS)
_CSP_HEADER = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
    "https://cdn.jsdelivr.net https://checkout.razorpay.com; "
    "style-src 'self' 'unsafe-inline' "
    "https://cdn.jsdelivr.net https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https://cdn.jsdelivr.net "
    "https://*.razorpay.com; "
    f"connect-src 'self' {_origins_str} "
    "https://lumberjack.razorpay.com; "
    "frame-src 'self' https://api.razorpay.com "
    "https://lumberjack.razorpay.com;"
)


# Security and Utilities Middleware
@app.middleware("http")
async def combined_middleware(request: Request, call_next):
    # 1. CSRF Protection (Double-submit cookie pattern)
    if not _IS_TESTING and request.method not in _SAFE_METHODS:
        skip_csrf = any(
            request.url.path.endswith(p) for p in _CSRF_SKIP_SUFFIXES
        )
        if not skip_csrf:
            if request.cookies.get("access_token") or \
               request.cookies.get("refresh_token"):
                csrf_cookie = request.cookies.get("csrf_token")
                csrf_header = request.headers.get("X-CSRF-Token")
                if not csrf_header or csrf_header != csrf_cookie:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token verification failed"},
                    )

    # 2. Timing
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # 3. Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    if _IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    # Set CSRF cookie if missing
    if not request.cookies.get("csrf_token"):
        response.set_cookie(
            "csrf_token",
            secrets.token_urlsafe(32),
            httponly=False,  # Readable by JS for subsequent requests
            secure=_IS_PRODUCTION,
            samesite="lax",
            path="/",
        )

    # Content Security Policy (pre-computed at startup)
    response.headers["Content-Security-Policy"] = _CSP_HEADER

    return response


# Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    is_prod = settings.SENTRY_ENVIRONMENT == "production"
    logging.error(
        f"Database error: {exc}",
        exc_info=not is_prod
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred."}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    is_prod = settings.SENTRY_ENVIRONMENT == "production"
    logging.error(f"Global Unhandled Error: {exc}", exc_info=not is_prod)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )


# CORS
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(o).rstrip("/") for o in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=86400,
    )

# Routers & Statics
app.include_router(api_router, prefix=settings.API_V1_STR)

uploads_dir = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Welcome to Dairy Management System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    from app.core.flags import flags

    return {
        "status": "healthy",
        "service": "dairy-os",
        "version": "1.0.0",
        "features": {
            "performance_metrics": flags.is_enabled("performance_metrics_view")
        },
    }


@app.get("/api/ready")
async def readiness_check():
    checks = {"database": False, "redis": True}
    try:
        from app.db.session import async_session

        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")

    try:
        from app.core.redis import get_redis

        redis = await get_redis()
        if redis:
            await redis.ping()
    except Exception:
        pass  # Redis optional

    all_healthy = checks["database"]
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks
        },
    )


Instrumentator().instrument(app).expose(app, endpoint="/metrics")
