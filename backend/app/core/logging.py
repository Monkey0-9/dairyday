import logging
import sys
import structlog
from typing import Any, List

from app.core.context import get_request_id, get_user_id, get_task_id


def setup_logging(
    level: int = logging.INFO, json_format: bool = True, include_sentry: bool = True
) -> None:
    """Configure structured logging using structlog."""

    # Processors for structlog
    processors: List[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]

    if json_format:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.WARNING)


def get_logger(name: str):
    """Get a structlog logger."""
    return structlog.get_logger(name).bind(
        service="dairy-os",
        request_id=get_request_id(),
        user_id=get_user_id(),
        task_id=get_task_id(),
    )


# Legacy aliases for compatibility
def info(logger, message: str, **kwargs):
    logger.info(message, **kwargs)


def error(logger, message: str, **kwargs):
    logger.error(message, **kwargs)


def debug(logger, message: str, **kwargs):
    logger.debug(message, **kwargs)


def warning(logger, message: str, **kwargs):
    logger.warning(message, **kwargs)


def mask_email(email: str | None) -> str:
    """Mask email for logging (e.g. ad***@example.com)."""
    if not email or "@" not in email:
        return "hidden"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        return f"{name}***@{domain}"
    return f"{name[:2]}***{name[-1]}@{domain}"
