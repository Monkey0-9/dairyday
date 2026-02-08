"""Request logging middleware with correlation IDs.

Provides structured logging for HTTP requests with:
- Automatic request ID generation and propagation
- Request/response timing
- User ID extraction for authenticated requests
- JSON log format for log aggregation
"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.context import set_request_id, get_request_id, set_user_id, get_user_id

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging every request and response.

    Adds:
    - Request ID header generation and propagation
    - User ID extraction from authenticated requests
    - Structured JSON logging with timing
    - Error handling with proper logging
    """

    # Paths to exclude from logging (health checks, metrics)
    EXCLUDE_PATHS = {
        "/api/health",
        "/api/ready",
        "/metrics",
        "/favicon.ico",
    }

    async def dispatch(self, request: Request, call_next):
        # Check if path should be excluded
        if request.url.path in self.EXCLUDE_PATHS:
            return await call_next(request)

        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            # Use context-aware ID generation
            request_id = get_request_id()

        # Set request ID in context and state
        set_request_id(request_id)
        request.state.request_id = request_id

        # Start timing
        start_time = time.time()

        # Log request start with structured data
        log_data = {
            "event": "request_start",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_string": self._redact_pii(request.url.query) if request.url.query else None,
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent"),
        }

        # Try to extract user ID from state
        if hasattr(request.state, "user_id") and request.state.user_id:
            user_id = str(request.state.user_id)
            set_user_id(user_id)
            log_data["user_id"] = user_id

        logger.info("Request started", extra={"extra_data": log_data})

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Build response log data
            response_log_data = {
                "event": "request_complete",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            }

            # Add user ID if available
            user_id = get_user_id()
            if user_id:
                response_log_data["user_id"] = user_id

            # Log based on status code
            if response.status_code >= 500:
                logger.error("Request completed with server error", extra={"extra_data": response_log_data})
            elif response.status_code >= 400:
                logger.warning("Request completed with client error", extra={"extra_data": response_log_data})
            else:
                logger.info("Request completed", extra={"extra_data": response_log_data})

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000

            error_log_data = {
                "event": "request_error",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration_ms, 2),
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            }

            # Add user ID if available
            user_id = get_user_id()
            if user_id:
                error_log_data["user_id"] = user_id

            logger.error("Request failed", extra={"extra_data": error_log_data})

            # Re-raise to let error handler deal with it
            raise

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check for forwarded IP (when behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Get first IP in chain (original client)
            return forwarded.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct connection
        if request.client:
            return request.client.host

        return None

    def _redact_pii(self, text: str) -> str:
        """Simple redactor for sensitive information."""
        if not text:
            return text
        
        sensitive_keys = ["email", "password", "token", "secret", "cvv", "card", "mobile", "phone"]
        import re
        
        redacted = text
        for key in sensitive_keys:
            # Pattern to match key=value or "key": "value"
            pattern = rf'({key})["\']?\s*[:=]\s*["\']?([^"\'&\s,]+)["\']?'
            redacted = re.sub(pattern, r'\1=[REDACTED]', redacted, flags=re.IGNORECASE)
        
        return redacted


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Lightweight middleware that only adds request ID.

    Use this if you don't need full request logging.
    """

    async def dispatch(self, request: Request, call_next):
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            from app.core.context import generate_request_id
            request_id = generate_request_id()

        # Set in context
        set_request_id(request_id)
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-ID"] = request_id

        return response

