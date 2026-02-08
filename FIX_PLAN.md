# Fix 1: Update Dependencies (BLOCKING ALL TESTS)

**File: `backend/requirements.txt`**
```txt
# Add these missing dependencies:
sentry-sdk>=2.0.0
aiosqlite>=0.19.0
redis>=5.0.0

# Verify complete requirements.txt:
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.25
alembic>=1.13.1
psycopg2-binary>=2.9.9
asyncpg>=0.29.0
pydantic>=2.5.3
pydantic-settings>=2.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
celery>=5.3.4
redis>=5.0.0
reportlab>=4.0.9
boto3>=1.34.34
razorpay>=1.4.1
openpyxl>=3.1.2
pytest>=8.0.0
pytest-asyncio>=0.23.4
httpx>=0.26.0
aiosqlite>=0.19.0
sentry-sdk>=2.0.0
slowapi>=0.1.9
prometheus-client>=0.19.0
```

# Fix 2: FastAPI Deprecation Warnings (BREAKING IN FUTURE)

**File: `backend/app/api/v1/endpoints/admin.py`**
```python
# ❌ OLD (Lines 21, 70, 161, 162):
month: str = Query(..., regex=r"^\d{4}-\d{2}$")
user_id: UUID = Query(..., regex=r"^[0-9a-f-]{36}$")

# ✅ NEW:
month: str = Query(..., pattern=r"^\d{4}-\d{2}$")
user_id: UUID = Query(..., pattern=r"^[0-9a-f-]{36}$")
```

# Fix 3: Import Order Issues

**File: `backend/app/api/v1/endpoints/consumption.py`**
```python
# ✅ CORRECT ORDER - Move ALL imports to top:
```

# Fix 4: Database Query Syntax Error

**File: `backend/app/main.py` (around line 230)**
```python
# ❌ OLD:
await session.execute("SELECT 1")

# ✅ NEW:
from sqlalchemy import text
await session.execute(text("SELECT 1"))
```

# Fix 5: Test Configuration & Fixtures

**File: `backend/tests/conftest.py`**

# Fix 6: Fix Failing Tests

**File: `backend/tests/test_flow.py`**

# Fix 7: Improve MinIO Healthcheck

**File: `docker-compose.yml`**

# Fix 8: Add Sentry Configuration

**File: `backend/app/core/config.py`**

# Fix 9: Add Database Indexes for Performance

**Create: `backend/alembic/versions/004_add_indexes.py`**

