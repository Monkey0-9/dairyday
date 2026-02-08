"""
Custom Prometheus metrics for DairyOS backend.
"""

from prometheus_client import Counter, Histogram, Gauge, Info
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time


# Request metrics
REQUEST_COUNT = Counter(
    "dairy_os_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "dairy_os_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Authentication metrics
LOGIN_ATTEMPTS = Counter(
    "dairy_os_login_attempts_total",
    "Total number of login attempts",
    ["status", "role"]
)

TOKEN_ISSUED = Counter(
    "dairy_os_tokens_issued_total",
    "Total number of tokens issued",
    ["token_type"]
)

# Business metrics
BILL_GENERATED = Counter(
    "dairy_os_bills_generated_total",
    "Total number of bills generated",
    ["month", "status"]
)

PAYMENT_PROCESSED = Counter(
    "dairy_os_payments_processed_total",
    "Total number of payments processed",
    ["status"]
)

CONSUMPTION_RECORDS = Counter(
    "dairy_os_consumption_records_total",
    "Total number of consumption records created/updated",
    ["action"]
)

# Active users gauge
ACTIVE_USERS = Gauge(
    "dairy_os_active_users",
    "Number of active users in the system"
)

# Database connection gauge
DB_CONNECTIONS = Gauge(
    "dairy_os_database_connections",
    "Current number of database connections"
)

# System info
SYSTEM_INFO = Info("dairy_os", "DairyOS system information")


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request metrics."""

    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint itself
        if request.url.path.startswith("/metrics"):
            return await call_next(request)

        method = request.method
        endpoint = request.url.path

        # Start timer
        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time

            # Normalize endpoint for better grouping
            normalized_endpoint = self._normalize_endpoint(endpoint)

            REQUEST_COUNT.labels(
                method=method,
                endpoint=normalized_endpoint,
                status_code=str(status_code)
            ).inc()

            REQUEST_LATENCY.labels(
                method=method,
                endpoint=normalized_endpoint
            ).observe(duration)

        return response

    def _normalize_endpoint(self, path: str) -> str:
        """Normalize endpoint path for better metric grouping."""
        # Replace UUID patterns
        import re
        normalized = re.sub(r'/[0-9a-fA-F-]{36}', '/{uuid}', path)
        # Replace date patterns
        normalized = re.sub(r'/\d{4}-\d{2}-\d{2}', '/{date}', normalized)
        # Replace month patterns
        normalized = re.sub(r'/\d{4}-\d{2}$', '/{month}', normalized)
        return normalized


def record_login_attempt(status: str, role: str):
    """Record a login attempt."""
    LOGIN_ATTEMPTS.labels(status=status, role=role).inc()


def record_token_issued(token_type: str):
    """Record a token being issued."""
    TOKEN_ISSUED.labels(token_type=token_type).inc()


def record_bill_generated(month: str, status: str):
    """Record a bill being generated."""
    BILL_GENERATED.labels(month=month, status=status).inc()


def record_payment(status: str):
    """Record a payment being processed."""
    PAYMENT_PROCESSED.labels(status=status).inc()


def record_consumption_action(action: str):
    """Record a consumption record action."""
    CONSUMPTION_RECORDS.labels(action=action).inc()


def set_active_users(count: int):
    """Set the number of active users."""
    ACTIVE_USERS.set(count)


def set_db_connections(count: int):
    """Set the current number of database connections."""
    DB_CONNECTIONS.set(count)


def set_system_info(version: str, environment: str):
    """Set system information."""
    SYSTEM_INFO.info({
        "version": version,
        "environment": environment
    })

