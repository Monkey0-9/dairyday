# Dairy Management System - Deployment Summary

## Overview

The Dairy Management System is a full-stack application consisting of:
- **Backend**: FastAPI (Python 3.11) with async SQLAlchemy, Celery workers
- **Frontend**: Next.js 14 (App Router) with TypeScript and Tailwind CSS
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **File Storage**: MinIO/S3 for PDF invoices

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer / CDN                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   Vercel (Frontend)     │    │   Railway/Render (Backend)│
│   - Next.js 14          │    │   - FastAPI              │
│   - Auto-scaling        │    │   - PostgreSQL           │
│   - Global CDN          │    │   - Redis                │
└─────────────────────────┘    │   - Celery Workers       │
                               └─────────────────────────┘
                                      │
                                      ▼
                          ┌─────────────────────────┐
                          │   MinIO / AWS S3        │
                          │   (PDF Invoice Storage) │
                          └─────────────────────────┘
```

---

## Prerequisites

Before deployment, ensure you have:
1. **GitHub Account** with the repository pushed
2. **Vercel Account** (for frontend)
3. **Railway Account** or **Render Account** (for backend)
4. **Razorpay Account** (for payments) - https://dashboard.razorpay.com
5. **AWS Account** or **MinIO** (for PDF storage)

---

## Part 1: Backend Deployment (Railway)

### Step 1: Prepare Repository

1. Push the `dairy-app` directory to GitHub:
   ```bash
   cd dairy-app
   git add .
   git commit -m "Production deployment"
   git push origin main
   ```

### Step 2: Deploy to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `dairy-app` repository
4. Configure the service:

   **Service Name**: `dairy-backend`
   
   **Root Directory**: `backend`

5. Click "Deploy"

### Step 3: Configure Environment Variables

In Railway dashboard, go to Variables tab and add:

```env
# Database (Railway will auto-provision PostgreSQL)
DATABASE_URL=postgresql://user:password@hostname:5432/dairy_db

# Security - Generate strong keys!
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
LOCK_DAYS=7

# Redis (Railway will auto-provision)
REDIS_URL=redis://:password@hostname:6379/0

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_BUCKET_NAME=dairy-bills
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_ENDPOINT_URL=https://s3.amazonaws.com

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx

# CORS
BACKEND_CORS_ORIGINS=["https://your-frontend.vercel.app"]

# Rate Limiting
RATE_LIMIT=100/minute
```

### Step 4: Set Up Database

1. In Railway, go to "Plugins" → "Add PostgreSQL"
2. Note the connection URL
3. Add `DATABASE_URL` variable with the PostgreSQL connection string

### Step 5: Set Up Redis

1. In Railway, go to "Plugins" → "Add Redis"
2. Note the connection URL
3. Add `REDIS_URL` variable

### Step 6: Run Migrations

1. In Railway, go to "Deployments" → Click on latest deployment
2. Click "Exec" tab
3. Run:
   ```bash
   alembic upgrade head
   ```

### Step 7: Seed Initial Data

```bash
python scripts/seed.py
```

This creates:
- Admin user: `admin@dairy.com` / `admin123`
- 10 test users: `user1@dairy.com` - `user10@dairy.com` / `user123`

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:

   **Framework Preset**: Next.js
   
   **Root Directory**: `frontend`
   
   **Build Command**: `npm run build`
   
   **Output Directory**: `.next`

### Step 2: Configure Environment Variables

In Vercel dashboard, go to Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

### Step 3: Deploy

Click "Deploy" and wait for build to complete.

---

## Part 3: Razorpay Configuration

### Step 1: Get API Keys

1. Go to https://dashboard.razorpay.com
2. Navigate to Settings → API Keys
3. Generate new API keys (test mode for development)

### Step 2: Configure Webhook

1. In Razorpay Dashboard, go to Settings → Webhooks
2. Click "Add New Webhook"
3. Enter:
   - **URL**: `https://your-backend.railway.app/api/v1/payments/webhook`
   - **Secret**: Generate a secret key
   - **Events**: Select `payment.captured` and `order.paid`
4. Save and copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

### Step 3: Add Keys to Backend

Update Railway environment variables:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Part 4: S3/MinIO Configuration

### Option A: AWS S3

1. Create S3 bucket: `dairy-bills`
2. Create IAM user with S3 access
3. Configure CORS for the bucket:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["https://your-frontend.vercel.app"],
       "ExposeHeaders": []
     }
   ]
   ```

### Option B: MinIO (Self-hosted)

If using MinIO (included in docker-compose):
- Endpoint: `http://minio:9000` (internal) or your MinIO URL
- Access Key: `minioadmin`
- Secret Key: `minioadmin`
- Bucket: `dairy-bills`

---

## Part 5: Verify Deployment

### Backend Health Check
```bash
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "dairy-os",
  "version": "1.0.0"
}
```

### Frontend Check
Visit `https://your-frontend.vercel.app`

### Login Test
1. Admin: `https://your-frontend.vercel.app/admin/login`
   - Email: `admin@dairy.com`
   - Password: `admin123`

2. User: `https://your-frontend.vercel.app/user/login`
   - Email: `user1@dairy.com`
   - Password: `user123`

---

## Part 6: Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Razorpay keys configured
- [ ] Webhook endpoint configured
- [ ] S3 bucket configured
- [ ] Environment variables set
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (optional)

---

## Rollback Procedure

### Backend Rollback (Railway)
1. Go to Deployments in Railway dashboard
2. Find previous working deployment
3. Click "Redeploy"

### Frontend Rollback (Vercel)
1. Go to Deployments in Vercel dashboard
2. Find previous working deployment
3. Click "Deploy" icon → "Redeploy"

---

## Troubleshooting

### Backend Issues
- Check logs in Railway dashboard
- Verify environment variables
- Ensure DATABASE_URL is correct

### Frontend Issues
- Check Vercel deployment logs
- Verify NEXT_PUBLIC_API_URL is correct
- Check browser console for errors

### Payment Issues
- Verify Razorpay keys
- Check webhook is receiving events
- Verify webhook signature validation

---

## Cost Estimation (Monthly)

| Service | Free Tier | Paid (if exceeded) |
|---------|-----------|-------------------|
| Railway Backend | $0 (512MB RAM) | ~$5-10/month |
| Railway PostgreSQL | $0 | ~$5/month |
| Railway Redis | $0 | ~$5/month |
| Vercel Frontend | $0 (100GB bandwidth) | ~$20/100GB |
| AWS S3 | ~$0 (5GB storage) | ~$0.023/GB |
| Razorpay | Free (test mode) | 2% per transaction |

---

## Support

For issues:
1. Check application logs
2. Verify environment variables
3. Review GitHub Issues
4. Contact: support@dairy-app.local

