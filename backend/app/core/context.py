"""Context management for request tracing.

Provides context variables for:
- request_id: Unique identifier for each HTTP request
- user_id: The authenticated user ID (if any)
- task_id: Celery task ID

These context variables are used for:
- Structured logging with correlation IDs
- Distributed tracing across services
- Request ID propagation to background tasks
"""
import contextvars
from typing import Optional
import uuid


# Context variables
# Using contextvars for async-safe storage that propagates across awaited calls
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
user_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("user_id", default=None)
task_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("task_id", default=None)


def generate_request_id() -> str:
    """Generate a new request ID.

    Format: req_{12 character hex}
    Example: req_a1b2c3d4e5f6
    """
    return f"req_{uuid.uuid4().hex[:12]}"


def generate_task_id() -> str:
    """Generate a new task ID for Celery tasks.

    Format: task_{8 character hex}
    Example: task_a1b2c3d4
    """
    return f"task_{uuid.uuid4().hex[:8]}"


def set_request_id(req_id: str) -> None:
    """Set the current request ID."""
    request_id_var.set(req_id)


def get_request_id() -> str:
    """Get the current request ID.

    Returns:
        The current request ID, or generates a new one if not set.
    """
    req_id = request_id_var.get()
    if not req_id:
        return generate_request_id()
    return req_id


def set_user_id(uid: Optional[str]) -> None:
    """Set the current user ID."""
    user_id_var.set(uid)


def get_user_id() -> Optional[str]:
    """Get the current user ID.

    Returns:
        The current user ID, or None if not authenticated.
    """
    return user_id_var.get()


def set_task_id(task_id: str) -> None:
    """Set the current task ID."""
    task_id_var.set(task_id)


def get_task_id() -> Optional[str]:
    """Get the current task ID.

    Returns:
        The current task ID, or None if not in a task context.
    """
    return task_id_var.get()


class RequestContext:
    """Context manager for request-scoped operations.

    Usage:
        with RequestContext() as ctx:
            ctx.request_id  # Access request ID
            ctx.user_id = user_id  # Set user ID
    """

    def __init__(self):
        self._previous_request_id: Optional[str] = None
        self._previous_user_id: Optional[str] = None
        self._previous_task_id: Optional[str] = None

    def __enter__(self) -> "RequestContext":
        """Enter the request context, saving previous values."""
        self._previous_request_id = request_id_var.get()
        self._previous_user_id = user_id_var.get()
        self._previous_task_id = task_id_var.get()

        # Generate new request ID if not set
        if not request_id_var.get():
            request_id_var.set(generate_request_id())

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the request context, restoring previous values."""
        request_id_var.set(self._previous_request_id or "")
        user_id_var.set(self._previous_user_id)
        task_id_var.set(self._previous_task_id)
        return False

    @property
    def request_id(self) -> str:
        """Get the current request ID."""
        return get_request_id()

    @property
    def user_id(self) -> Optional[str]:
        """Get the current user ID."""
        return get_user_id()

    @property
    def task_id(self) -> Optional[str]:
        """Get the current task ID."""
        return get_task_id()

    @request_id.setter
    def request_id(self, value: str):
        """Set the current request ID."""
        set_request_id(value)

    @user_id.setter
    def user_id(self, value: Optional[str]):
        """Set the current user ID."""
        set_user_id(value)

    @task_id.setter
    def task_id(self, value: Optional[str]):
        """Set the current task ID."""
        set_task_id(value)


def copy_context() -> dict:
    """Create a snapshot of the current context.

    Returns:
        Dictionary with request_id, user_id, and task_id.
    """
    return {
        "request_id": get_request_id(),
        "user_id": get_user_id(),
        "task_id": get_task_id(),
    }


def restore_context(context: dict) -> None:
    """Restore context from a snapshot.

    Args:
        context: Dictionary with request_id, user_id, and task_id.
    """
    if "request_id" in context:
        set_request_id(context["request_id"])
    if "user_id" in context:
        set_user_id(context["user_id"])
    if "task_id" in context:
        set_task_id(context["task_id"])

