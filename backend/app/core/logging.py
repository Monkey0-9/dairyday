"""Structured logging configuration for DairyOS.

Provides JSON-formatted logs with correlation IDs for:
- Request tracing across services
- Log aggregation in ELK/Splunk/etc.
- Debugging distributed systems
"""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings
from app.core.context import get_request_id, get_user_id, get_task_id


class JSONFormatter(logging.Formatter):
    """Outputs logs as JSON for easy parsing by log aggregators.

    Adds correlation IDs (request_id, user_id, task_id) to all log entries.
    """

    DEFAULT_FIELDS = {
        "service": "dairy-os",
        "version": "1.0.0",
    }

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string."""
        log_data = {
            # Standard logging fields
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            # Tracing context from context variables
            "request_id": get_request_id(),
            "user_id": get_user_id(),
            "task_id": get_task_id(),
            # Service metadata
            **self.DEFAULT_FIELDS,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "stacktrace": self.formatException(record.exc_info),
            }

        # Add extra fields from record
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_data.update(record.extra_data)

        # Add any custom attributes on the record
        if hasattr(record, "__data__"):
            log_data.update(record.__data__)

        return json.dumps(log_data)


class CustomLogRecord(logging.LogRecord):
    """Custom log record with additional fields."""
    pass


def setup_logging(
    level: int = logging.INFO,
    json_format: bool = True,
    include_sentry: bool = True
) -> None:
    """Configure structured logging for DairyOS.

    Args:
        level: Minimum log level (default: INFO)
        json_format: Whether to output JSON format (default: True)
        include_sentry: Whether to integrate with Sentry (default: True)
    """
    # Use custom log record class
    logging.setLogRecordFactory(CustomLogRecord)

    # Create handler
    handler = logging.StreamHandler(sys.stdout)

    if json_format:
        handler.setFormatter(JSONFormatter())
    else:
        # Human-readable format for development
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(level)

    # Configure specific loggers
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.WARNING)

    # Sentry integration - only if DSN is configured
    if include_sentry and settings.SENTRY_DSN:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.logging import LoggingIntegration

            sentry_logging = LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            )

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                integrations=[sentry_logging],
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
                release="1.0.0",
                environment=settings.SENTRY_ENVIRONMENT,
            )
            logging.info("Sentry initialized successfully")
        except Exception as e:
            logging.warning(f"Failed to initialize Sentry: {e}")
    elif include_sentry:
        logging.debug("Sentry DSN not configured - error tracking disabled")


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the standard configuration.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


class LoggerMixin:
    """Mixin for classes that need logging.

    Usage:
        class MyService(LoggerMixin):
            def __init__(self):
                self.logger = get_logger(__name__)

            def do_something(self):
                self.logger.info("Doing something")
    """

    @property
    def logger(self) -> logging.Logger:
        """Get a logger for this class."""
        return get_logger(self.__class__.__module__ + "." + self.__class__.__name__)


def log_with_context(
    logger: logging.Logger,
    level: int,
    message: str,
    extra: Optional[Dict[str, Any]] = None,
    **kwargs
) -> None:
    """Log a message with automatic context inclusion.

    Args:
        logger: Logger instance
        level: Log level (e.g., logging.INFO)
        message: Log message
        extra: Additional fields to include
        **kwargs: Additional context fields
    """
    extra_data = extra or {}
    extra_data.update(kwargs)

    # Wrap in extra_data key for JSON formatter
    logger.log(level, message, extra={"extra_data": extra_data})


# Convenience functions
def debug(logger: logging.Logger, message: str, **kwargs):
    """Log at DEBUG level with context."""
    log_with_context(logger, logging.DEBUG, message, **kwargs)


def info(logger: logging.Logger, message: str, **kwargs):
    """Log at INFO level with context."""
    log_with_context(logger, logging.INFO, message, **kwargs)


def warning(logger: logging.Logger, message: str, **kwargs):
    """Log at WARNING level with context."""
    log_with_context(logger, logging.WARNING, message, **kwargs)


def error(logger: logging.Logger, message: str, exc_info: bool = False, **kwargs):
    """Log at ERROR level with context."""
    if exc_info:
        kwargs["exc_info"] = True
    log_with_context(logger, logging.ERROR, message, **kwargs)


def critical(logger: logging.Logger, message: str, **kwargs):
    """Log at CRITICAL level with context."""
    log_with_context(logger, logging.CRITICAL, message, **kwargs)

