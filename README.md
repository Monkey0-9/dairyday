# dairyday - Enterprise Dairy Management System

A production-ready, enterprise-grade dairy management system built with modern technologies.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- 4GB+ RAM
- 10GB+ Disk space

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dairyday
   ```

2. **Start the infrastructure**
   ```bash
   docker-compose up -d db redis minio
   ```

3. **Set up the backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your settings
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

4. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - MinIO Console: http://localhost:9001

### Production Deployment with Docker Compose

1. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit with production values
   ```

2. **Build and start all services**
   ```bash
   docker-compose up -d --build
   ```

3. **Verify deployment**
   ```bash
   curl http://localhost/api/health
   ```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (Nginx)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
    │   Frontend      │ │   Backend     │ │    Celery       │
    │   (Next.js)     │ │   (FastAPI)   │ │    Workers      │
    └─────────────────┘ └───────────────┘ └─────────────────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
│  PostgreSQL   │     │     Redis       │     │     MinIO     │
│  (Database)   │     │  (Cache/Broker) │     │  (S3 Storage) │
└───────────────┘     └─────────────────┘     └───────────────┘
```

## 📁 Project Structure

```
dairyday/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # API endpoints
│   │   ├── core/               # Configuration, security, metrics
│   │   ├── db/                 # Database session and base
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── workers/            # Celery workers
│   ├── alembic/                # Database migrations
│   ├── scripts/                # Utility scripts
│   ├── tests/                  # Unit and integration tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── admin/              # Admin pages
│   │   ├── user/               # User pages
│   │   └── layout.tsx
│   ├── components/             # React components
│   ├── lib/                    # Utilities
│   ├── package.json
│   ├── Dockerfile
│   └── Dockerfile.dev
├── nginx.conf                  # Reverse proxy config
├── docker-compose.yml
└── README.md
```

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Role-based Access Control** (Admin/User)
- **Rate Limiting** on all endpoints
- **CORS Configuration** for allowed origins
- **HTTPS Support** via nginx
- **Security Headers** (X-Frame-Options, X-XSS-Protection, etc.)

## 📊 Features

### Admin Features
- User management (create, update, deactivate)
- Daily milk consumption entry
- Monthly consumption grid view
- Bulk CSV/XLSX import
- Bill generation and management
- Payment tracking and reminders
- Audit logs for all changes

### User Features
- Dashboard with consumption charts
- Monthly bill viewing
- Payment via Razorpay
- PDF invoice download
- Consumption history

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret key | Auto-generated |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | Required |
| `AWS_ACCESS_KEY_ID` | S3/MinIO access key | Required |
| `AWS_SECRET_ACCESS_KEY` | S3/MinIO secret key | Required |
| `AWS_BUCKET_NAME` | S3 bucket name | Required |
| `RAZORPAY_KEY_ID` | Razorpay key | Optional |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | Optional |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | localhost:3000 |

### Database Schema

- **users**: Customer and admin accounts
- **consumption**: Daily milk delivery records
- **consumption_audit**: Change history
- **bills**: Monthly invoices
- **payments**: Payment transactions
- **idempotency_keys**: Prevent duplicate webhook processing
- **webhook_events**: Razorpay webhook logs

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📈 Monitoring

- **Prometheus Metrics**: `/metrics`
- **Health Check**: `/api/health`
- **Readiness Check**: `/api/ready`
- **Structured Logging**: JSON format with request correlation

## 🚀 CI/CD

GitHub Actions workflows are configured for:
- Backend CI: Linting, testing, security scanning
- Frontend CI: Build, lint, test

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/v1/users/` - List all users
- `POST /api/v1/users/` - Create user
- `PATCH /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Deactivate user

### Consumption
- `GET /api/v1/consumption/grid` - Monthly grid view
- `GET /api/v1/consumption/mine` - User's consumption
- `PATCH /api/v1/consumption/` - Upsert consumption
- `POST /api/v1/consumption/upload` - Bulk import

### Bills
- `GET /api/v1/bills/` - List bills for month
- `GET /api/v1/bills/{user_id}/{month}` - Get bill
- `POST /api/v1/bills/generate/{user_id}/{month}` - Generate bill
- `POST /api/v1/bills/generate-all` - Generate all bills

### Payments
- `POST /api/v1/payments/create-order/{bill_id}` - Create payment order
- `POST /api/v1/payments/webhook` - Razorpay webhook

## 🔧 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env

2. **Redis connection failed**
   - Check Redis is running
   - Verify REDIS_URL in .env

3. **MinIO upload failed**
   - Check MinIO is running
   - Verify bucket exists and permissions

4. **Frontend build fails**
   - Ensure Node.js 18+ is installed
   - Clear node_modules and reinstall

### Logs

```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# All logs
docker-compose logs
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support, please contact the development team.

