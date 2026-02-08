# P0 Critical Implementation Plan

## Executive Summary
This plan addresses the P0 (Critical) items for making the backend "truth" and bulletproof: monetary correctness, bill generation idempotency, webhook hardening, auth security, and observability.

---

## Phase 1: Central Money Utilities & Monetary Correctness

### 1.1 Create `app/core/money.py`
```python
"""Central Money utilities for DairyOS.

Provides consistent monetary handling with:
- Decimal-based calculations
- Banker's rounding (ROUND_HALF_EVEN)
- Currency formatting for INR
- Tax calculation support
"""
from decimal import Decimal, ROUND_HALF_EVEN
from dataclasses import dataclass
from typing import Optional

# Rounding policy: Banker's rounding for financial accuracy
DEFAULT_ROUNDING = ROUND_HALF_EVEN
DECIMAL_PRECISION = Decimal("0.01")  # 2 decimal places for currency
LITER_PRECISION = Decimal("0.001")   # 3 decimal places for quantity

@dataclass(frozen=True)
class Money:
    """Immutable Money value object."""
    amount: Decimal

    def __post_init__(self):
        object.__setattr__(self, 'amount', self.amount.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))

    @classmethod
    def from_float(cls, value: float) -> "Money":
        return cls(Decimal(str(value)))

    @classmethod
    def from_int_cents(cls, cents: int) -> "Money":
        return cls(Decimal(cents) / Decimal("100"))

    def __add__(self, other: "Money") -> "Money":
        return Money(self.amount + other.amount)

    def __sub__(self, other: "Money") -> "Money":
        return Money(self.amount - other.amount)

    def __mul__(self, other: Decimal) -> "Money":
        return Money((self.amount * other).quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))

    def __truediv__(self, other: Decimal) -> "Money":
        return Money((self.amount / other).quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))

    def to_cents(self) -> int:
        return int(self.amount * Decimal("100"))

    def to_str(self, currency: str = "INR") -> str:
        """Format as Indian Rupee string."""
        s = f"{self.amount:.2f}"
        parts = s.split(".")
        integer_part = parts[0]
        result = ""
        for i, digit in enumerate(reversed(integer_part)):
            if i > 0 and i % 2 == 0:
                result = "," + result
            result = digit + result
        return f"₹{result}.{parts[1]}"

    def to_json(self) -> str:
        return str(self.amount)


def calculate_amount(quantity: Decimal, unit_price: Decimal) -> Money:
    """Calculate total amount with proper Decimal precision."""
    amount = quantity * unit_price
    return Money(amount.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))


def round_liters(liters: float) -> Decimal:
    """Round liters to 3 decimal places."""
    return Decimal(str(liters)).quantize(LITER_PRECISION)
```

### 1.2 Update `app/services/billing.py`
- Replace direct Decimal usage with `from app.core.money import Money, calculate_amount`
- Add price snapshot: `price_snapshot: Decimal` (store at time of bill generation)
- Add tax snapshot if applicable
- Add `created_at` with timezone

### 1.3 Update `app/models/bill.py`
Add snapshot columns:
```python
price_snapshot = Column(Numeric(10, 3), nullable=False, default=0.0)
tax_rate_snapshot = Column(Numeric(5, 4), nullable=True)  # e.g., 0.1800 for 18%
created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 1.4 Create Database Migration
```python
"""Add price/tax snapshots and audit fields to bills."""
def upgrade():
    op.add_column('bills', Column('price_snapshot', Numeric(10, 3), nullable=False, server_default='0.0'))
    op.add_column('bills', Column('tax_rate_snapshot', Numeric(5, 4), nullable=True))
    op.add_column('bills', Column('created_at', DateTime(timezone=True), server_default=func.now()))
```

---

## Phase 2: Bill Generation Idempotency

### 2.1 Add Advisory Locks to Bill Generation

Update `app/services/billing.py`:

```python
from app.core.redis import get_redis
import uuid

async def generate_bill_for_user(
    db: AsyncSession, 
    user_id: UUID, 
    month: str,
    enqueue_pdf: bool = True
) -> Bill:
    """Generate or update a bill for a user for a specific month.
    
    Uses advisory lock to ensure idempotent bill generation across
    concurrent workers.
    """
    # Acquire distributed lock
    lock_key = f"bill:generate:{user_id}:{month}"
    lock_value = str(uuid.uuid4())
    lock_acquired = False
    
    try:
        redis = get_redis()
        lock_acquired = redis.set(
            lock_key, 
            lock_value, 
            nx=True, 
            ex=300  # 5 min timeout
        )
        
        if not lock_acquired:
            # Another worker is generating this bill, wait briefly and retry once
            import asyncio
            await asyncio.sleep(0.5)
            
            # Try to fetch the bill again
            bill_result = await db.execute(
                select(Bill).where(Bill.user_id == user_id, Bill.month == month)
            )
            existing_bill = bill_result.scalars().first()
            if existing_bill:
                return existing_bill
            
            # If still not found, this shouldn't happen normally
            raise Exception(f"Could not acquire lock for bill generation: {lock_key}")
        
        # ... rest of bill generation logic ...
        
    finally:
        # Release lock
        if lock_acquired:
            current_value = redis.get(lock_key)
            if current_value == lock_value.encode():
                redis.delete(lock_key)
```

### 2.2 Add Optimistic Locking to Bill Model

```python
# In app/models/bill.py
class Bill(Base):
    # ... existing columns ...
    version = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

# Update bill with optimistic locking
if bill:
    stmt = (
        update(Bill)
        .where(Bill.id == bill.id, Bill.version == bill.version)
        .values(
            total_liters=total_liters,
            total_amount=total_amount,
            version=bill.version + 1,
            updated_at=func.now()
        )
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise ConcurrentModificationError("Bill was modified by another process")
```

---

## Phase 3: Webhook Hardening

### 3.1 Add Timestamp Skew Check

Update `app/api/v1/endpoints/payments.py`:

```python
from datetime import datetime, timedelta, timezone

@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Verify Timestamp (Razorpay sends X-Razorpay-Timestamp header)
    timestamp = request.headers.get('X-Razorpay-Timestamp')
    if timestamp:
        try:
            webhook_time = datetime.fromtimestamp(int(timestamp), tz=timezone.utc)
            now = datetime.now(timezone.utc)
            skew = abs((now - webhook_time).total_seconds())
            
            if skew > 300:  # 5 minutes
                raise HTTPException(
                    status_code=400, 
                    detail=f"Webhook timestamp too old or future: {skew}s skew"
                )
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid timestamp format")
```

### 3.2 Add Webhook Event Details Column

```python
# In app/models/webhook_event.py
from sqlalchemy import JSON, Index

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False)  # 'razorpay', 'stripe'
    event_id = Column(String, nullable=False)  # Unique from provider
    event_type = Column(String, nullable=True)  # 'payment.captured', 'order.paid'
    payload = Column(JSON, nullable=True)  # Full webhook payload for audit
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="received")  # 'received', 'processed', 'failed'
    
    __table_args__ = (
        UniqueConstraint('provider', 'event_id', name='uix_provider_event'),
        Index('idx_webhook_provider_event', 'provider', 'event_id'),
        Index('idx_webhook_received_at', 'received_at'),
    )
```

### 3.3 Update Webhook Processing

```python
# In payments.py webhook handler
# After signature verification
event_id = data.get("id") or payment_entity.get("id")  # Razorpay provides event_id

# Idempotency check
existing_event = await db.execute(
    select(WebhookEvent).where(
        and_(WebhookEvent.provider == "razorpay", WebhookEvent.event_id == event_id)
    )
)
if existing_event.scalars().first():
    return {"status": "success", "message": "already_processed"}

# Create event record
webhook_event = WebhookEvent(
    provider="razorpay",
    event_id=event_id,
    event_type=data.get("event"),
    payload=data,
    status="processing"
)
db.add(webhook_event)
await db.flush()

# ... process payment ...

# Mark event as processed
webhook_event.status = "processed"
webhook_event.processed_at = func.now()
```

---

## Phase 4: Auth Security Hardening

### 4.1 Update Security Settings

In `app/core/config.py`:
```python
# Auth security settings
ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access tokens
AUTH_RATE_LIMIT: str = "5/minute"  # Stricter for auth endpoints
MAX_LOGIN_ATTEMPTS: int = 5
LOCKOUT_DURATION_MINUTES: int = 15
```

### 4.2 Add Login Attempt Tracking

```python
# In app/core/security.py
LOGIN_ATTEMPTS_PREFIX = "auth:login_attempts:"

def get_login_attempts_key(email: str) -> str:
    return f"{LOGIN_ATTEMPTS_PREFIX}{email.lower()}"

def record_failed_attempt(redis, email: str, max_attempts: int = 5) -> int:
    """Record a failed login attempt and return current count."""
    key = get_login_attempts_key(email)
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, 900)  # 15 minute window
    pipe.execute()
    return int(redis.get(key) or 0)

def check_account_locked(redis, email: str, max_attempts: int = 5) -> bool:
    """Check if account is temporarily locked."""
    key = get_login_attempts_key(email)
    attempts = int(redis.get(key) or 0)
    return attempts >= max_attempts

def clear_login_attempts(redis, email: str):
    """Clear login attempts on successful login."""
    key = get_login_attempts_key(email)
    redis.delete(key)
```

### 4.3 Update Login Endpoint with Rate Limiting

```python
# In app/api/v1/endpoints/auth.py
from app.core.security import (
    record_failed_attempt, 
    check_account_locked, 
    clear_login_attempts
)

@router.post("/login")
async def login_access_token(
    db: AsyncSession = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends(), 
    response: Response = None
) -> Any:
    from app.core.redis import get_redis
    redis = get_redis()
    
    email = form_data.username.lower()
    
    # Check if account is locked
    if check_account_locked(redis, email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Account locked for 15 minutes.",
            headers={"Retry-After": "900"}
        )
    
    # ... existing authentication logic ...
    
    # On successful login, clear failed attempts
    clear_login_attempts(redis, email)
    
    # Set secure cookie
    if response is not None:
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,  # Always True in production
            samesite="strict",
            max_age=access_token_expires.seconds,
            path="/",
        )
```

---

## Phase 5: Secrets Management

### 5.1 Create `.env.example`

```bash
# Copy this file to .env and fill in values
# NEVER commit .env to version control

# Application
PROJECT_NAME=DairyOS
API_V1_STR=/api/v1

# Database (use shared instance for dev, separate for prod)
POSTGRES_SERVER=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=dairy_db

# Security - GENERATE NEW VALUES FOR PRODUCTION
SECRET_KEY=change-this-in-production-use-openssl-rand-base64-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_MINUTES=10080

# Rate Limiting
RATE_LIMIT=100/minute

# Redis
REDIS_URL=redis://redis:6379/0

# AWS/S3 (optional for local development)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_NAME=dairy-bills

# Razorpay (get from dashboard.razorpay.com)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Optional: Sentry (get from sentry.io)
SENTRY_DSN=

# Optional: TOTP encryption key (generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key())")
TOTP_ENCRYPTION_KEY=
```

### 5.2 Add `.gitignore` entries

```gitignore
# Secrets
.env
.env.local
.env.*.local
*.pem
*.key
*.crt

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Python
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage
htmlcov/

# Node
node_modules/
.next/
dist/
build/
```

---

## Phase 6: Observability & Structured Logging

### 6.1 Create `app/core/context.py`

```python
"""Context management for request tracing."""
import contextvars
from typing import Optional
import uuid

# Context variables
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
user_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("user_id", default=None)
task_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("task_id", default=None)

def generate_request_id() -> str:
    return f"req_{uuid.uuid4().hex[:12]}"

def generate_task_id() -> str:
    return f"task_{uuid.uuid4().hex[:8]}"

def set_request_id(req_id: str):
    request_id_var.set(req_id)

def get_request_id() -> str:
    return request_id_var.get() or generate_request_id()

def set_user_id(uid: Optional[str]):
    user_id_var.set(uid)

def get_user_id() -> Optional[str]:
    return user_id_var.get()

def set_task_id(task_id: str):
    task_id_var.set(task_id)

def get_task_id() -> Optional[str]:
    return task_id_var.get()
```

### 6.2 Update `app/core/logging.py`

```python
"""Structured logging configuration for DairyOS."""
import logging
import sys
import json
from datetime import datetime
from app.core.context import get_request_id, get_user_id, get_task_id

class JSONFormatter(logging.Formatter):
    """Outputs logs as JSON for easy parsing by log aggregators."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            # Tracing context
            "request_id": get_request_id(),
            "user_id": get_user_id(),
            "task_id": get_task_id(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data)


def setup_logging():
    """Configure structured logging."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)
    
    # Configure specific loggers
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
```

### 6.3 Update Request Logging Middleware

```python
# In app/middleware/request_logging.py
from app.core.context import set_request_id, set_user_id
import uuid

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with timing and correlation IDs."""
    
    async def dispatch(self, request: Request, call_next):
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        set_request_id(request_id)
        
        # Start timer
        start_time = time.time()
        
        # Add request ID to response headers
        response = Response()
        response.headers["X-Request-ID"] = request_id
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log request
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": request.client.host if request.client else None,
            }
            
            if response.status_code >= 400:
                logger.warning("Request completed with error", extra=log_data)
            else:
                logger.info("Request completed", extra=log_data)
            
            return response
            
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                }
            )
            raise
```

---

## Phase 7: Reconciliation Job (Nightly)

### 7.1 Create `app/services/reconciliation.py`

```python
"""Nightly reconciliation job for payments and bills."""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dataclasses import dataclass
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bill import Bill
from app.models.payment import Payment

logger = logging.getLogger(__name__)


@dataclass
class ReconciliationIssue:
    """Issue found during reconciliation."""
    type: str  # 'payment_without_bill', 'bill_without_payment', 'amount_mismatch'
    bill_id: str | None
    payment_id: str | None
    details: str
    severity: str  # 'error', 'warning'


class ReconciliationService:
    """Service for reconciling payments with bills."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.issues: List[ReconciliationIssue] = []
    
    async def run_nightly_reconciliation(self, date: datetime = None) -> Dict[str, Any]:
        """Run the nightly reconciliation job."""
        if date is None:
            date = datetime.utcnow() - timedelta(days=1)
        
        logger.info(f"Starting nightly reconciliation for {date.date()}")
        
        # Find all paid bills
        paid_bills = await self._get_paid_bills_for_date(date)
        
        # Check each paid bill has a matching payment
        for bill in paid_bills:
            await self._check_bill_payment_match(bill)
        
        # Find payments without bills
        await self._check_payments_without_bills(date)
        
        # Report results
        return self._generate_report()
    
    async def _get_paid_bills_for_date(self, date: datetime) -> List[Bill]:
        """Get all bills paid on the given date."""
        result = await self.db.execute(
            select(Bill)
            .where(Bill.status == "PAID")
            .where(func.date(Bill.updated_at) == date.date())
        )
        return result.scalars().all()
    
    async def _check_bill_payment_match(self, bill: Bill):
        """Check if a paid bill has a corresponding payment record."""
        result = await self.db.execute(
            select(Payment).where(Payment.bill_id == bill.id)
        )
        payments = result.scalars().all()
        
        if not payments:
            self.issues.append(ReconciliationIssue(
                type="bill_without_payment",
                bill_id=str(bill.id),
                payment_id=None,
                details=f"Bill {bill.id} is PAID but has no payment record",
                severity="error"
            ))
            return
        
        # Check amounts match
        total_payment = sum(p.amount or 0 for p in payments)
        if abs(float(total_payment) - float(bill.total_amount)) > 0.01:
            self.issues.append(ReconciliationIssue(
                type="amount_mismatch",
                bill_id=str(bill.id),
                payment_id=str(payments[0].id),
                details=f"Bill amount ₹{bill.total_amount} != Payment amount ₹{total_payment}",
                severity="error"
            ))
    
    async def _check_payments_without_bills(self, date: datetime):
        """Find payments that don't have corresponding bills."""
        result = await self.db.execute(
            select(Payment)
            .where(func.date(Payment.paid_at) == date.date())
        )
        payments = result.scalars().all()
        
        for payment in payments:
            bill_result = await self.db.execute(
                select(Bill).where(Bill.id == payment.bill_id)
            )
            bill = bill_result.scalars().first()
            
            if not bill:
                self.issues.append(ReconciliationIssue(
                    type="payment_without_bill",
                    bill_id=None,
                    payment_id=str(payment.id),
                    details=f"Payment {payment.id} has no corresponding bill",
                    severity="warning"
                ))
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate reconciliation report."""
        error_count = sum(1 for i in self.issues if i.severity == "error")
        warning_count = sum(1 for i in self.issues if i.severity == "warning")
        
        return {
            "date": datetime.utcnow().date().isoformat(),
            "status": "failed" if error_count > 0 else "passed",
            "summary": {
                "total_issues": len(self.issues),
                "errors": error_count,
                "warnings": warning_count,
            },
            "issues": [
                {
                    "type": i.type,
                    "bill_id": i.bill_id,
                    "payment_id": i.payment_id,
                    "details": i.details,
                    "severity": i.severity,
                }
                for i in self.issues
            ]
        }
```

---

## Phase 8: Database Indexes & Constraints

### 8.1 Create Migration for Indexes

```python
"""Add indexes for performance optimization."""
def upgrade():
    # Bills table indexes
    op.create_index('idx_bills_status', 'bills', ['status'])
    op.create_index('idx_bills_created_at', 'bills', ['created_at'])
    op.create_index('idx_bills_updated_at', 'bills', ['updated_at'])
    
    # Payments table indexes
    op.create_index('idx_payments_status', 'payments', ['status'])
    op.create_index('idx_payments_provider', 'payments', ['provider'])
    op.create_index('idx_payments_paid_at', 'payments', ['paid_at'])
    op.create_index('idx_payments_provider_payment_id', 'payments', ['provider_payment_id'])
    
    # Users table indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    
    # Consumption table indexes
    op.create_index('idx_consumption_date', 'consumption', ['date'])
```

---

## Files to Create/Modify Summary

| File | Action |
|------|--------|
| `backend/app/core/money.py` | Create |
| `backend/app/core/context.py` | Create |
| `backend/app/core/totp.py` | Create |
| `backend/app/models/totp_secret.py` | Create |
| `backend/app/services/reconciliation.py` | Create |
| `backend/app/services/billing.py` | Modify |
| `backend/app/models/bill.py` | Modify |
| `backend/app/models/webhook_event.py` | Modify |
| `backend/app/api/v1/endpoints/payments.py` | Modify |
| `backend/app/api/v1/endpoints/auth.py` | Modify |
| `backend/app/core/security.py` | Modify |
| `backend/app/core/logging.py` | Modify |
| `backend/app/middleware/request_logging.py` | Modify |
| `backend/app/workers/celery_app.py` | Modify |
| `backend/app/workers/tasks.py` | Modify |
| `.env.example` | Create |
| `README.md` | Modify |

---

## Quick Wins (Next Sprint)

1. **Add s3_key column to bills** - Store S3 key separately from signed URL
2. **Update frontend to poll/notify** - Invoice readiness status
3. **Add Sentry + source maps** - Frontend error tracking
4. **Enforce price_per_liter DB default** - Already in billing code
5. **Add rate limiting to auth endpoints** - Using SlowAPI

---

## Measurable Targets

| Metric | Target |
|--------|--------|
| Backend p95 latency | < 200ms |
| Backend p99 latency | < 1s |
| Celery task success ratio | > 99.5% |
| Lighthouse scores | > 95 |
| Test coverage | >= 85% (billing 95%+) |
| Payment reconciliation mismatch | 0% |

