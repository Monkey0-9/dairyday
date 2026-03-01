# DairyDay Deployment Guide

Complete deployment instructions for the DairyDay full-stack application.

## 📋 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│  Python/FastAPI │────▶│   SQLite/Postgre│
│   (Frontend)    │◄────│   (Backend API) │◄────│   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                         │
        ▼                         ▼
   Vercel/Railway            Railway/Render/Fly
```

---

## Phase 1: Pre-Deployment Checklist

### 1.1 Environment Variables

Create `.env.production` in frontend:
```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.dairyday.app
NEXT_PUBLIC_APP_URL=https://dairyday.app
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

Create `.env` in backend:
```env
# Database (SQLite for small, PostgreSQL for scale)
DATABASE_URL=sqlite:///dairy.db
# For PostgreSQL: postgresql://user:pass@localhost/dairyday

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=https://dairyday.app,https://www.dairyday.app

# Razorpay (Payments)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# UPI
UPI_ID=dairyday@upi
UPI_NAME=DairyDay Heritage

# AI (if using)
OPENAI_API_KEY=sk-xxx
```

### 1.2 Build Test Locally

```bash
# Frontend
cd frontend
npm ci
npm run build
# Should complete without errors

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Test API starts
uvicorn app.main:app --reload
```

---

## Phase 2: Database Setup

### Option A: SQLite (Small-scale, single instance)
- Already configured
- Backup strategy: Automated backups via cron

### Option B: PostgreSQL (Recommended for production)

**Railway PostgreSQL:**
1. Create project on Railway
2. Add PostgreSQL plugin
3. Copy `DATABASE_URL` to backend env

**Supabase (Free tier friendly):**
1. Create project at supabase.com
2. Get connection string
3. Run migrations: `alembic upgrade head`

---

## Phase 3: Backend Deployment

### Recommended: Railway (Easiest)

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial production build"
   git push origin main
   ```

2. **Connect Railway**
   - Login to railway.app
   - New Project → Deploy from GitHub repo
   - Select your repository
   - Railway auto-detects Python/Docker

3. **Add Environment Variables**
   - Go to Variables tab
   - Add all from `.env`
   - Railway auto-generates `DATABASE_URL` if using their PostgreSQL

4. **Generate Domain**
   - Settings → Domains → Generate Domain
   - Copy: `https://dairyday-api.up.railway.app`

### Alternative: Render

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: dairyday-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.0
      - key: DATABASE_URL
        fromDatabase:
          name: dairyday-db
          property: connectionString
      - key: SECRET_KEY
        generateRandomString: 32

databases:
  - name: dairyday-db
    databaseName: dairyday
    user: dairyday
```

2. Push to GitHub
3. Create Blueprint on Render

### Alternative: Fly.io (Best Performance)

```bash
# Install flyctl
iwr https://fly.io/install.ps1 -useb | iex  # Windows
curl -L https://fly.io/install.sh | sh     # Mac/Linux

# Launch
fly launch
cd backend
fly deploy
```

Create `fly.toml`:
```toml
app = "dairyday-api"
primary_region = "bom"  # Mumbai

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"

[[services]]
  internal_port = 8000
  protocol = "tcp"
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

---

## Phase 4: Frontend Deployment (Vercel)

### 4.1 Prepare for Production

Update `next.config.js` for production:
```javascript
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,  // Required if not using Vercel image optimization
  },
  // ... rest of config
};
```

### 4.2 Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login & Deploy**
   ```bash
   cd frontend
   vercel login
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel Dashboard**
   - Go to vercel.com/dashboard
   - Select project → Settings → Environment Variables
   - Add all variables from `.env.production`

4. **Add Custom Domain** (Optional)
   - Settings → Domains
   - Add `dairyday.app`
   - Follow DNS instructions

### 4.3 Build Settings

Vercel auto-detects Next.js. Ensure these settings:
- Framework Preset: Next.js
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm ci`

---

## Phase 5: Connect Frontend ↔ Backend

### Update CORS

In backend `app/core/config.py` or main file:
```python
ALLOWED_ORIGINS = [
    "https://dairyday.vercel.app",  # Your Vercel URL
    "https://dairyday.app",          # Your custom domain
    "https://www.dairyday.app",
]
```

### Update Frontend API URL

Set in Vercel environment:
```
NEXT_PUBLIC_API_URL=https://dairyday-api.up.railway.app
```

---

## Phase 6: Custom Domain Setup

### 6.1 Buy Domain

Recommended registrars:
- **Cloudflare Registrar** (wholesale pricing)
- **Namecheap** (easy management)
- **Google Domains** (clean UI)

### 6.2 Configure DNS

**For Vercel (Frontend):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For Railway/Render (Backend):**
Use the provided domain or:
```
Type: CNAME
Name: api
Value: your-app.up.railway.app
```

### 6.3 SSL Certificates

Both Vercel and Railway provide free SSL automatically.

---

## Phase 7: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy DairyDay

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install & Test Frontend
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Test Backend
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: railway/cli@v4
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
      - run: railway up --service=dairyday-api

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

Add secrets in GitHub:
- `RAILWAY_TOKEN` - From Railway dashboard
- `VERCEL_TOKEN` - From Vercel settings
- `VERCEL_ORG_ID` - From Vercel project settings
- `VERCEL_PROJECT_ID` - From Vercel project settings

---

## Phase 8: Post-Deployment Checklist

### 8.1 Verify Deployment

```bash
# Test API health
curl https://api.dairyday.app/api/health

# Test frontend
curl -I https://dairyday.app
```

### 8.2 Critical Tests

- [ ] Login works
- [ ] Dashboard loads data
- [ ] Payments process correctly
- [ ] QR code generates
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive
- [ ] Language switcher works

### 8.3 Monitoring Setup

**Sentry (Already configured):**
- Check Sentry dashboard for errors
- Set up alerts for critical issues

**Uptime Monitoring:**
- Add to UptimeRobot (free): https://uptimerobot.com
- Ping API every 5 minutes
- Alert on downtime

**Performance:**
- Add to Google Analytics
- Core Web Vitals monitoring in Vercel Analytics

---

## Phase 9: Backup Strategy

### Database Backups

**SQLite (if using):**
```bash
# Add to crontab (daily backup)
0 2 * * * cp /path/to/dairy.db /backups/dairy-$(date +%Y%m%d).db
```

**PostgreSQL:**
Railway/Render provide automated backups. Verify:
- Backup retention: 7+ days
- Test restore process monthly

### Code Backups

Already on GitHub, but also:
```bash
# Mirror to another remote
git remote add backup https://gitlab.com/yourusername/dairyday.git
```

---

## Troubleshooting

### Issue: CORS errors
**Fix:** Update `ALLOWED_ORIGINS` in backend with exact Vercel URL

### Issue: Images not loading
**Fix:** Add domains to `next.config.js`:
```javascript
images: {
  domains: ['your-cdn.com', 'localhost'],
}
```

### Issue: Environment variables not loading
**Fix:** 
- Frontend: Must use `NEXT_PUBLIC_` prefix for client-side
- Redeploy after adding env vars

### Issue: Build fails
**Fix:**
```bash
# Clear cache
rm -rf .next node_modules package-lock.json
npm ci
npm run build
```

---

## Cost Estimates (Monthly)

| Service | Small Scale | Production |
|---------|-------------|------------|
| Vercel (Frontend) | $0 (free) | $20/mo |
| Railway (Backend + DB) | $5/mo | $20/mo |
| Domain | $12/yr | $12/yr |
| Sentry | $0 (free) | $26/mo |
| **Total** | **~$5/mo** | **~$60/mo** |

---

## Quick Deploy Commands

```bash
# One-shot deploy (manual)
cd frontend && vercel --prod
cd backend && railway up

# Or with Git push (auto-deploy)
git add . && git commit -m "Deploy v1.0" && git push origin main
```

---

**You're live!** 🚀

Test everything at your custom domain. Monitor Sentry for errors first 48 hours.
