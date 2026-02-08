# Dairy Management System - Runbook

## Table of Contents

1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Maintenance Commands](#maintenance-commands)
4. [Troubleshooting](#troubleshooting)
5. [API Reference](#api-reference)

---

## Local Development

### Prerequisites

- Docker 24+
- Docker Compose v2
- Git

### Quick Start

```bash
# 1. Clone or navigate to the project
cd dairy-app

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start all services
docker-compose up --build

# 4. Wait for services to be ready (about 30-60 seconds)
# 5. Run migrations (handled automatically by startup command)
# 6. Seed the database
docker-compose exec backend python scripts/seed.py
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:8000 | - |
| API Docs | http://localhost:8000/docs | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dairy.com | admin123 |
| User | user1@dairy.com | user123 |

### Development Workflow

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend

# Stop all services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v

# Run tests
docker-compose exec backend pytest -q

# Run linter
docker-compose exec backend ruff check .

# Access backend container shell
docker-compose exec backend /bin/bash

# Access database
docker-compose exec postgres psql -U postgres -d dairy_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

---

## Production Deployment

### Environment Setup

#### Backend (.env)

```bash
# Copy the example file
cp backend/.env.example backend/.env

# Edit with production values
nano backend/.env
```

Required variables:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_urlsafe(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
LOCK_DAYS=7
REDIS_URL=redis://:pass@host:6379/0
AWS_REGION=us-east-1
AWS_BUCKET_NAME=dairy-bills
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_ENDPOINT_URL=https://s3.amazonaws.com
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxx
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
RATE_LIMIT=100/minute
```

#### Frontend (.env.local)

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

Required variable:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
```

### Docker Production Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.yml up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Scale workers (example)
docker-compose up -d --scale worker=3

# Rolling restart
docker-compose up -d --no-deps backend
```

### Railway Deployment Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set SECRET_KEY=<your-secret-key>
railway variables set DATABASE_URL=<your-db-url>
# ... set all other variables

# Deploy
railway up

# Run migrations
railway run alembic upgrade head

# Seed data
railway run python scripts/seed.py

# Check logs
railway logs
```

### Vercel Frontend Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (interactive)
vercel --prod

# Or link existing project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production

# Deploy
vercel --prod --yes
```

---

## Maintenance Commands

### Database Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision -m "description"

# Upgrade to latest
docker-compose exec backend alembic upgrade head

# Downgrade one migration
docker-compose exec backend alembic downgrade -1

# Show current revision
docker-compose exec backend alembic current

# Show migration history
docker-compose exec backend alembic history
```

### Database Operations

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres dairy_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres dairy_db < backup.sql

# Run SQL directly
docker-compose exec postgres psql -U postgres -d dairy_db -c "SELECT * FROM users;"
```

### Cache Operations

```bash
# Clear all Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Check Redis info
docker-compose exec redis redis-cli INFO

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR
```

### User Management

```bash
# Create admin user manually
docker-compose exec backend python -c "
from app.db.session import async_session
from app.models.user import User
from app.core.security import get_password_hash
import asyncio

async def create_admin():
    async with async_session() as session:
        admin = User(
            email='admin@dairy.com',
            hashed_password=get_password_hash('admin123'),
            name='Admin User',
            role='ADMIN',
            price_per_liter=0,
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print('Admin created')

asyncio.run(create_admin())
"

# Reset user password
docker-compose exec backend python -c "
from app.db.session import async_session
from app.models.user import User
from app.core.security import get_password_hash
import asyncio

async def reset_password():
    email = input('Email: ')
    new_pass = input('New password: ')
    async with async_session() as session:
        result = await session.execute(User.__table__.select().where(User.email == email))
        user = result.scalars().first()
        if user:
            user.hashed_password = get_password_hash(new_pass)
            await session.commit()
            print('Password reset')
        else:
            print('User not found')

asyncio.run(reset_password())
"
```

### Log Rotation

```bash
# View container logs with rotation
docker-compose logs --tail=1000 backend | head -n 1000 > logs.txt

# Configure log driver for production (in docker-compose.yml)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Troubleshooting

### Common Issues

#### 1. Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common causes:
# - DATABASE_URL incorrect
# - PostgreSQL not ready
# - Port 8000 in use
```

**Solutions:**
```bash
# Check port usage
lsof -i :8000

# Restart PostgreSQL first
docker-compose restart postgres
docker-compose restart backend
```

#### 2. Frontend build fails

```bash
# Check Node version
docker-compose exec frontend node -v

# Should be >= 18.x

# Clear Next.js cache
docker-compose exec frontend rm -rf .next
docker-compose exec frontend npm run build
```

#### 3. Database connection refused

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec backend python -c "
import asyncio
from app.db.session import engine

async def test():
    try:
        async with engine.connect() as conn:
            await conn.execute('SELECT 1')
        print('Database connected')
    except Exception as e:
        print(f'Connection failed: {e}')

asyncio.run(test())
"
```

#### 4. Redis connection failed

```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Should return PONG
```

#### 5. Webhook not working

```bash
# Verify webhook URL is publicly accessible
curl -X POST https://your-domain.com/api/v1/payments/webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# Check Razorpay dashboard for webhook logs
```

#### 6. PDF generation fails

```bash
# Check Celery worker logs
docker-compose logs worker

# Common causes:
# - ReportLab not installed
# - S3 credentials wrong
# - Bucket doesn't exist
```

### Health Check Commands

```bash
# Backend health
curl http://localhost:8000/api/health

# Database health
curl http://localhost:8000/api/ready

# Full system check
docker-compose ps
docker-compose exec backend python -c "
import asyncio
from app.db.session import engine
from app.core.redis import get_redis

async def health_check():
    checks = {'database': False, 'redis': False}
    
    try:
        async with engine.connect() as conn:
            await conn.execute('SELECT 1')
        checks['database'] = True
    except:
        pass
    
    try:
        redis = get_redis()
        redis.ping()
        checks['redis'] = True
    except:
        pass
    
    print('Health Check:', checks)
    return all(checks.values())

result = asyncio.run(health_check())
exit(0 if result else 1)
"
```

---

## API Reference

### Authentication Endpoints

#### POST /api/v1/auth/login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@dairy.com&password=admin123"
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "admin@dairy.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

#### POST /api/v1/auth/refresh
```bash
curl -X POST "http://localhost:8000/api/v1/auth/refresh?refresh_token=<token>"
```

#### POST /api/v1/auth/logout
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

### Consumption Endpoints

#### GET /api/v1/consumption/grid?month=YYYY-MM
```bash
curl "http://localhost:8000/api/v1/consumption/grid?month=2026-01" \
  -H "Authorization: Bearer <admin_token>"
```

#### GET /api/v1/consumption/mine?month=YYYY-MM
```bash
curl "http://localhost:8000/api/v1/consumption/mine?month=2026-01" \
  -H "Authorization: Bearer <user_token>"
```

#### PATCH /api/v1/consumption/
```bash
curl -X PATCH http://localhost:8000/api/v1/consumption/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "date": "2026-01-15", "quantity": 5.0}'
```

### Bills Endpoints

#### POST /api/v1/bills/generate/{user_id}/{month}
```bash
curl -X POST "http://localhost:8000/api/v1/bills/generate/USER_ID/2026-01" \
  -H "Authorization: Bearer <admin_token>"
```

#### GET /api/v1/bills/{user_id}/{month}
```bash
curl "http://localhost:8000/api/v1/bills/USER_ID/2026-01" \
  -H "Authorization: Bearer <token>"
```

### Payments Endpoints

#### POST /api/v1/payments/create-order/{bill_id}
```bash
curl -X POST "http://localhost:8000/api/v1/payments/create-order/BILL_ID" \
  -H "Authorization: Bearer <user_token>"
```

#### POST /api/v1/payments/webhook
```bash
curl -X POST http://localhost:8000/api/v1/payments/webhook \
  -H "X-Razorpay-Signature: <signature>" \
  -H "Content-Type: application/json" \
  -d @webhook-payload.json
```

### Admin Endpoints

#### GET /api/v1/admin/daily-entry?date=YYYY-MM-DD
```bash
curl "http://localhost:8000/api/v1/admin/daily-entry?selected_date=2026-01-15" \
  -H "Authorization: Bearer <admin_token>"
```

#### POST /api/v1/admin/daily-entry
```bash
curl -X POST "http://localhost:8000/api/v1/admin/daily-entry?selected_date=2026-01-15" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '[{"user_id": "uuid", "quantity": 5.0}]'
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SECRET_KEY` | Yes | - | JWT signing key (32+ chars) |
| `ALGORITHM` | No | HS256 | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | Token expiration |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | Refresh token expiration |
| `LOCK_DAYS` | No | 7 | Days after which data is locked |
| `REDIS_URL` | Yes | - | Redis connection string |
| `AWS_ACCESS_KEY_ID` | For S3 | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | For S3 | - | AWS secret key |
| `AWS_BUCKET_NAME` | For S3 | - | S3 bucket name |
| `AWS_ENDPOINT_URL` | Optional | - | S3 endpoint (for MinIO) |
| `RAZORPAY_KEY_ID` | For payments | - | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | For payments | - | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | - | Razorpay webhook secret |
| `BACKEND_CORS_ORIGINS` | No | [] | Allowed CORS origins |
| `RATE_LIMIT` | No | 100/minute | Rate limit |

---

## Security Checklist

- [ ] `SECRET_KEY` is unique and strong
- [ ] `DATABASE_URL` uses SSL in production
- [ ] `RAZORPAY_KEY_SECRET` and webhook secret are secure
- [ ] CORS origins are restricted to known domains
- [ ] Rate limiting is enabled
- [ ] Webhook signature verification is enabled
- [ ] No secrets in version control
- [ ] HTTPS enabled in production
- [ ] Audit logging enabled

