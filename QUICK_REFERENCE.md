# DairyDay Developer Quick Reference

## 🎨 Design System

### Colors
```css
/* Primary - Indigo */
--primary: 239 84% 67%  /* #6366f1 */
--primary-foreground: 0 0% 100%

/* Milk Accent */
--milk-cream: #fef3c7
--milk-pure: #ffffff

/* Surfaces */
--background: 240 10% 4%     /* #0a0a0f */
--card: 240 10% 6%           /* #12121a */
--popover: 240 10% 8%        /* #1a1a25 */
```

### Tailwind Classes
```html
<!-- Glassmorphism Card -->
<div class="glass-card">

<!-- Glow Button -->
<button class="btn-glow shadow-glow hover:shadow-glow-intense">

<!-- Touch Target (44px minimum) -->
<button class="min-h-[44px] min-w-[44px]">

<!-- Text Gradient -->
<span class="text-gradient">
```

## 🧩 Components

### Button Variants
```tsx
<Button variant="default">Primary</Button>
<Button variant="glow">Glow Effect</Button>
<Button variant="glass">Glass Card</Button>
<Button variant="outline">Outline</Button>
<Button size="xl">Large CTA</Button>
```

### Dialog (Fixed Z-Index)
```tsx
<Dialog>
  <DialogContent className="z-[101]">
    {/* Content - scrollable area */}
    <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
      {...}
    </div>
  </DialogContent>
</Dialog>
```

### Mobile Bottom Nav
```tsx
import { BottomNav } from "@/components/mobile/bottom-nav"

<BottomNav role="admin" />  {/* or role="customer" */}
```

## 🔌 API Endpoints

### UTR Payments
```http
POST   /api/v1/utr/submit-utr          # Submit UTR (Customer)
POST   /api/v1/utr/verify-utr/{id}     # Verify UTR (Admin)
GET    /api/v1/utr/pending-verification # List pending (Admin)
GET    /api/v1/utr/my-utr-submissions  # My submissions (Customer)
```

### Authentication
```http
POST   /api/v1/auth/login              # Login
POST   /api/v1/auth/refresh           # Refresh token
POST   /api/v1/auth/logout            # Logout
```

## 🗄️ Database

### Key Tables
| Table | Purpose |
|-------|---------|
| `users` | Customers & admins |
| `consumption` | Daily milk entries |
| `bills` | Monthly invoices |
| `payments` | UTR & online payments |
| `consumption_audit` | Change history |

### Important Indexes
```sql
-- Fast lookups
idx_consumption_user_date_range ON (user_id, date) WHERE locked = false
idx_bills_user_month_status ON (user_id, month, status)
idx_payments_utr_number ON (utr_number)
idx_payments_pending_verification ON (status) WHERE status = 'PENDING_VERIFICATION'
```

## 📱 Mobile-First Guidelines

### Touch Targets
- **Minimum**: 44px × 44px
- **Standard**: 48px height
- **Primary CTAs**: 56px height

### Safe Areas
```css
/* Notch support */
pb-[env(safe-area-inset-bottom)]
pt-[env(safe-area-inset-top)]
```

### Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

## 🎭 Animation Classes

```html
<!-- Entrance -->
<div class="animate-in fade-in slide-in-from-bottom-4 duration-500">

<!-- Hover Effects -->
<div class="hover:-translate-y-0.5 hover:shadow-glow transition-all duration-200">

<!-- Tap Feedback -->
<button class="active:scale-[0.96] tap-bounce">

<!-- Shimmer Loading -->
<div class="skeleton-shimmer">
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Required
DATABASE_URL=postgresql://user:pass@localhost/dairydb
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key

# File Uploads
AWS_BUCKET_NAME=dairyday-screenshots
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Common Commands

### Development
```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev

# Database
cd backend
alembic upgrade head
```

### Testing
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test

# E2E tests
cd frontend
npx playwright test
```

## 📦 Key Dependencies

### Frontend
- `framer-motion` - Animations
- `lucide-react` - Icons
- `sonner` - Toasts
- `@tanstack/react-query` - Data fetching
- `tailwindcss-animate` - Tailwind animations

### Backend
- `fastapi` - API framework
- `sqlalchemy` - ORM
- `alembic` - Migrations
- `redis` - Caching
- `python-jose` - JWT tokens

## 🐛 Debugging

### Backend Logs
```python
from app.core.logging import get_logger
logger = get_logger(__name__)
logger.info("Message")
logger.error("Error", exc_info=True)
```

### Frontend Console
```typescript
// Development only
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}
```

## 🔒 Security Checklist

- [ ] Rate limiting on auth endpoints (5/min)
- [ ] Rate limiting on UTR submission (3/min)
- [ ] UTR validation (12-22 alphanumeric)
- [ ] File upload size limits (5MB)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] CORS configured

## 📊 Performance Targets

- API response: <200ms (p95)
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Performance: >90
- Lighthouse Accessibility: >95

## 🆘 Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Check PostgreSQL running
docker ps | grep postgres

# Run migrations
alembic upgrade head
```

**Redis connection failed**
```bash
# Check Redis running
docker ps | grep redis

# Test connection
redis-cli ping
```

**Frontend build errors**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

## 📞 Support

For detailed specifications:
- `REDESIGN_MASTERPLAN.md` - Complete redesign plan
- `CHANGELOG.md` - Implementation log
- `IMPLEMENTATION_SUMMARY.md` - Status report

---

**Last Updated**: February 22, 2026
**Version**: 2.0 - Premium Redesign
