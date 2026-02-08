# DairyOS - Implementation Plan

Based on the comprehensive feedback, this document outlines the complete implementation plan organized by priority.

---

## Phase 1: Immediate Hot-Fixes (Sprint 0 - 2 days)

### 1.1 Frontend: Guard Against Crashing Bill Button

**File:** `frontend/app/admin/bills/page.tsx`

**Current Issue:** The Bill button crashes when `pdf_url` is missing or undefined.

**Fix:**
```typescript
// In the Action cellRenderer, add guards:
cellRenderer: (params: ICellRendererParams) => {
    const bill = params.data
    if (!bill) {
        return <span className="text-muted-foreground text-xs">Loading...</span>
    }
    
    // Check if PDF is being generated (async job)
    const isGenerating = bill.status === 'GENERATING' || !bill.pdf_url
    
    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => generateBill(params.data.user_id)}
            disabled={isGenerating || isGenerating}
            className="h-7 px-2 text-xs"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Queued
                </>
            ) : (
                "Regenerate"
            )}
        </Button>
    )
}
```

**Add InfoCard for pending PDF generation:**
```typescript
// Replace "Pending" text with:
if (!('pdf_url' in bill) || !bill.pdf_url) {
    return (
        <div className="flex items-center gap-1 text-amber-500 text-xs">
            <Clock className="h-3 w-3" />
            Generating...
        </div>
    )
}
```

### 1.2 Backend: Return 202 for Async PDF Generation

**File:** `backend/app/api/v1/endpoints/bills.py`

**Current:** Returns 200 with bill data immediately.

**Fix:** Modify `/generate/{user_id}/{month}` to return 202 with job status:
```python
@router.post("/generate/{user_id}/{month}")
async def generate_bill(
    user_id: UUID,
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    # ... existing logic ...
    
    # Instead of awaiting PDF generation, queue it
    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        r.ping()
        generate_invoice_task.delay(str(bill_id))
    except Exception:
        background_tasks.add_task(generate_pdf_task, bill_id)
    
    # Return 202 Accepted with job info
    return JSONResponse(
        status_code=202,
        content={
            "status": "queued",
            "job": "pdf_generation",
            "bill_id": str(bill_id),
            "message": "PDF generation started. Check back in 1-2 minutes."
        }
    )
```

### 1.3 Empty State Components

**Create:** `frontend/components/ui/empty-state.tsx`

```typescript
import { Button } from "./button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

**Usage in Bills page:**
```typescript
import { EmptyState } from "@/components/ui/empty-state"
import { FileText, Upload } from "lucide-react"

// Replace overlayNoRowsTemplate with:
<EmptyState
    icon={FileText}
    title="No bills found"
    description={`No bills generated for ${month}. Generate bills to populate data.`}
    action={{
        label: "Generate Bills",
        onClick: generateAllBills
    }}
/>
```

**Usage in Consumption page:**
```typescript
<EmptyState
    icon={Upload}
    title="No consumption data"
    description="No entries for this month. Enter today's data or import a CSV."
    action={{
        label: "Enter Today's Data",
        onClick: () => {/* navigate to daily-entry */}
    }}
/>
```

### 1.4 Loading Skeletons for Grids

**Add skeleton states to Bills and Consumption pages:**

```typescript
// In Bills page:
if (isLoading) {
    return (
        <div className="container py-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    )
}
```

### 1.5 Seed Database & Verify

**Commands:**
```bash
# Start services
docker-compose up -d postgres redis minio

# Wait for services
sleep 30

# Run migrations
docker-compose exec backend python -m alembic upgrade head

# Seed data
docker-compose exec backend python scripts/seed.py

# Verify
docker-compose exec backend psql -U postgres -d dairy_db -c "SELECT count(*) FROM users;"
docker-compose exec backend psql -U postgres -d dairy_db -c "SELECT count(*) FROM consumption;"
```

---

## Phase 2: Design System & UI Foundations

### 2.1 Update Tailwind Config with Design Tokens

**File:** `frontend/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Design System Palette (neutral, modern enterprise)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        
        // Primary (teal-ish)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        
        // Accent (blue for CTAs)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Status colors
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        
        // UI colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: "hsl(var(--destructive))",
        popover: "hsl(var(--popover))",
        card: "hsl(var(--card))",
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "18px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgba(2, 6, 23, 0.6)",
        "elev-2": "0 6px 18px rgba(2, 6, 23, 0.7)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### 2.2 Update CSS Variables

**File:** `frontend/app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Design System Colors */
  --color-background: #0B0F12;
  --color-surface: #0F1518;
  --color-muted: #8F9AA3;
  --color-primary: #0EA5A8;
  --color-accent: #2563EB;
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  
  /* HSL versions for CSS variables */
  --background: 222 47% 3%;
  --foreground: 210 40% 98%;
  --surface: 217 33% 6%;
  --muted: 215 20% 65%;
  --primary: 174 70% 42%;
  --accent: 221 83% 53%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --danger: 0 84% 60%;
  
  /* Borders and inputs */
  --border: 217 33% 16%;
  --input: 217 33% 16%;
  --ring: 174 70% 42%;
  
  /* Surface elevations */
  --elev-1: 0 1px 2px rgba(2, 6, 23, 0.6);
  --elev-2: 0 6px 18px rgba(2, 6, 23, 0.7);
  
  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  
  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
}

/* Typography utilities */
.text-balance {
  text-wrap: balance;
}

.font-tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* AG Grid dark theme overrides */
.ag-theme-quartz-dark {
  --ag-background-color: #0F1518;
  --ag-foreground-color: #E5E7EB;
  --ag-header-background-color: #0B0F12;
  --ag-row-hover-color: rgba(14, 165, 168, 0.1);
  --ag-selected-row-background-color: rgba(14, 165, 168, 0.15);
  --ag-border-color: rgba(255, 255, 255, 0.1);
  --ag-header-foreground-color: #8F9AA3;
}
```

---

## Phase 3: Backend Improvements

### 3.1 Billing Correctness with Decimal

**File:** `backend/app/services/billing.py`

```python
from decimal import Decimal, ROUND_HALF_UP

async def calculate_bill_amount(total_liters: Decimal, price_per_liter: Decimal) -> Decimal:
    """
    Calculate the total bill amount with proper Decimal precision.
    
    Uses ROUND_HALF_UP to round to 2 decimal places (paise).
    """
    amount = total_liters * price_per_liter
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

### 3.2 Bill Snapshotting Table

**Create:** `backend/app/models/bill_version.py`

```python
from sqlalchemy import Column, UUID, String, DECIMAL, DateTime, Text, ForeignKey
from app.db.base import Base
import uuid
from datetime import datetime

class BillVersion(Base):
    """Immutable snapshot of bill at generation time."""
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id"), nullable=False)
    
    # Snapshot of values at generation time
    month = Column(String(7), nullable=False)
    total_liters = Column(DECIMAL(10, 3), nullable=False)
    price_per_liter = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    
    # Snapshot of user info
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_name = Column(String(255), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # JSON snapshot of daily consumption
    daily_breakdown = Column(Text)  # JSON string
```

### 3.3 Webhook HMAC Verification with Timestamp Skew

**File:** `backend/app/api/v1/endpoints/payments.py`

```python
import time
from fastapi import Request, HTTPException, Header

@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    x_razorpay_timestamp: str = Header(None, alias="X-Razorpay-Timestamp"),
):
    # 1. Verify timestamp (allow 5 minute skew)
    if x_razorpay_timestamp:
        try:
            timestamp = int(x_razorpay_timestamp)
            current_time = int(time.time())
            if abs(current_time - timestamp) > 300:  # 5 minutes
                raise HTTPException(status_code=401, detail="Webhook timestamp expired")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    # 2. Get raw body for HMAC verification
    body_bytes = await request.body()
    
    # 3. Verify signature
    if settings.RAZORPAY_KEY_SECRET and x_razorpay_signature:
        # If timestamp is present, include it in signature verification
        if x_razorpay_timestamp:
            payload = f"{x_razorpay_timestamp}.{body_bytes.decode('utf-8')}"
        else:
            payload = body_bytes.decode('utf-8')
            
        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    # ... rest of webhook logic
```

### 3.4 Consumption Audit Logging

**Create:** `backend/app/models/consumption_audit.py`

```python
from sqlalchemy import Column, UUID, String, DECIMAL, Date, DateTime, ForeignKey, Text, Enum
import enum
import uuid
from datetime import datetime
from app.db.base import Base

class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class ConsumptionAudit(Base):
    """Audit log for consumption changes."""
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User whose consumption was modified
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Date of consumption
    date = Column(Date, nullable=False)
    
    # Admin who made the change (null if system)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Old and new values
    old_quantity = Column(DECIMAL(10, 3), nullable=True)
    new_quantity = Column(DECIMAL(10, 3), nullable=True)
    
    # Action type
    action = Column(Enum(AuditAction), nullable=False)
    
    # Reason for change (optional)
    reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Update consumption endpoint to log audits:**

```python
@router.patch("/")
async def update_consumption(
    consumption_data: ConsumptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    # ... existing logic ...
    
    # Log audit entry
    audit = ConsumptionAudit(
        user_id=consumption_data.user_id,
        date=consumption_data.date,
        admin_id=current_user.id if current_user.role == "ADMIN" else None,
        old_quantity=old_value,
        new_quantity=consumption_data.quantity,
        action=AuditAction.UPDATE,
        reason=consumption_data.reason
    )
    db.add(audit)
    
    await db.commit()
```

---

## Phase 4: Frontend Architecture

### 4.1 Proposed File Structure

```
frontend/
 ├─ app/
 │  ├─ layout.tsx
 │  ├─ providers/
 │  │  ├─ auth-provider.tsx
 │  │  ├─ theme-provider.tsx
 │  │  └─ query-client.tsx
 │  ├─ admin/
 │  │  ├─ daily-entry/
 │  │  │  └─ page.tsx
 │  │  ├─ consumption/
 │  │  │  └─ page.tsx
 │  │  ├─ bills/
 │  │  │  └─ page.tsx
 │  │  └─ users/
 │  │     └─ page.tsx
 │  └─ user/
 │     ├─ dashboard/
 │     │  └─ page.tsx
 │     └─ bills/
 │        └─ page.tsx
 ├─ components/
 │  ├─ ui/
 │  │  ├─ Button.tsx
 │  │  ├─ Card.tsx
 │  │  ├─ Input.tsx
 │  │  ├─ Badge.tsx
 │  │  ├─ Table.tsx      # AG Grid wrapper
 │  │  ├─ Modal.tsx
 │  │  ├─ Skeleton.tsx
 │  │  ├─ EmptyState.tsx
 │  │  ├─ Toast.tsx
 │  │  └─ index.ts
 │  ├─ layout/
 │  │  ├─ Sidebar.tsx
 │  │  ├─ Topbar.tsx
 │  │  └─ Layout.tsx
 │  └─ features/
 │     ├─ consumption-grid/
 │     │  ├─ index.tsx
 │     │  └─ use-consumption-grid.ts
 │     └─ billing/
 │        ├─ bill-table.tsx
 │        └─ use-bills.ts
 ├─ lib/
 │  ├─ api.ts       # Typed API client (auto-generated)
 │  ├─ auth.ts
 │  ├─ hooks/
 │  │  ├─ use-auth.ts
 │  │  ├─ use-theme.ts
 │  │  └─ index.ts
 │  └─ utils.ts
 └─ styles/
    └─ globals.css
```

### 4.2 Typed API Client

**Create:** `frontend/lib/api.ts`

```typescript
import axios from "axios"
import type { AxiosInstance, AxiosRequestConfig } from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token")
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          if (typeof window !== "undefined") {
            localStorage.removeItem("token")
            window.location.href = "/login"
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config)
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config)
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config)
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config)
  }
}

export const api = new ApiClient()

// Typed API functions
export const billsApi = {
  list: (month: string) => api.get<BillsResponse>(`/bills/?month=${month}`),
  generate: (userId: string, month: string) =>
    api.post<{ status: string; job: string }>(`/bills/generate/${userId}/${month}`),
  generateAll: (month: string) =>
    api.post<{ status: string; count: number }>(`/bills/generate-all?month=${month}`),
}

export const consumptionApi = {
  getGrid: (month: string) => api.get<ConsumptionGridResponse>(`/consumption/grid?month=${month}`),
  update: (data: { user_id: string; date: string; quantity: number }) =>
    api.patch("/consumption/", data),
}
```

---

## Phase 5: Database Schema Changes

### 5.1 New Migration File

**File:** `backend/alembic/versions/xxx_add_bill_versions_and_audit.py`

```python
"""add bill versions and audit

Revision ID: xxx
Revises: 146209271ff7
Create Date: 2024-XX-XX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'xxx'
down_revision = '146209271ff7'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create bill_versions table
    op.create_table(
        'bill_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('bill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bills.id'), nullable=False),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('total_liters', sa.Numeric(10, 3), nullable=False),
        sa.Column('price_per_liter', sa.Numeric(10, 2), nullable=False),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_name', sa.String(255), nullable=False),
        sa.Column('daily_breakdown', sa.Text),  # JSON
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )
    
    # Create consumption_audit table
    op.create_table(
        'consumption_audit',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('old_quantity', sa.Numeric(10, 3)),
        sa.Column('new_quantity', sa.Numeric(10, 3)),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('reason', sa.Text),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('ix_bill_versions_bill_id', 'bill_versions', ['bill_id'])
    op.create_index('ix_consumption_audit_user_date', 'consumption_audit', ['user_id', 'date'])
    op.create_index('ix_consumption_audit_created_at', 'consumption_audit', ['created_at'])
    
    # Add CHECK constraint for consumption quantity
    op.execute('ALTER TABLE consumption ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)')

def downgrade() -> None:
    op.drop_table('consumption_audit')
    op.drop_table('bill_versions')
    op.execute('ALTER TABLE consumption DROP CONSTRAINT chk_quantity_positive')
```

---

## Phase 6: DevOps & CI/CD

### 6.1 GitHub Actions Workflows

**Update:** `.github/workflows/backend-ci.yml`

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          
      - name: Install dependencies
        run: |
          pip install ruff mypy
          cd backend && pip install -r requirements.txt
          
      - name: Lint with ruff
        run: ruff check backend/
        
      - name: Type check with mypy
        run: mypy backend/

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: dairy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          
      - name: Install dependencies
        run: |
          pip install pytest pytest-cov httpx
          cd backend && pip install -r requirements.txt
          
      - name: Run tests
        run: cd backend && pytest tests/ -v --cov --cov-report=xml
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run safety check
        run: |
          pip install safety
          safety check -r backend/requirements.txt
```

### 6.2 Lighthouse CI Configuration

**Create:** `frontend/lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./.next",
      "numberOfRuns": 3,
      "settings": {
        "url": ["http://localhost:3000"],
        "headless": true
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.85 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## Phase 7: Testing

### 7.1 Playwright E2E Tests

**Create:** `frontend/tests/e2e/admin-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin Daily Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/admin/login')
    await page.fill('[name="email"]', 'admin@dairy.com')
    await page.fill('[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should load consumption grid with seed users', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/consumption')
    await page.waitForSelector('.ag-theme-quartz')
    
    // Check that grid has rows (seeded users)
    const rows = await page.locator('.ag-row').count()
    expect(rows).toBeGreaterThan(0)
  })

  test('should allow editing consumption within 7 days', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/consumption')
    
    // Find an editable cell (today or within 7 days)
    const cell = page.locator('[col-id="day_' + new Date().getDate() + '"]').first()
    await cell.click()
    await cell.fill('5.5')
    await cell.press('Enter')
    
    // Verify save indicator appears
    await expect(page.locator('.save-indicator')).toBeVisible()
  })

  test('should prevent editing consumption older than 7 days', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/consumption')
    
    // Find a locked cell (older than 7 days)
    const lockedCell = page.locator('.cell-locked').first()
    await lockedCell.click()
    
    // Should show lock icon and not be editable
    await expect(lockedCell.locator('.lock-icon')).toBeVisible()
  })
})

test.describe('Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/admin/login')
    await page.fill('[name="email"]', 'admin@dairy.com')
    await page.fill('[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
  })

  test('should generate bills and return 202', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/bills')
    
    // Click generate all
    await page.click('button:has-text("Generate All")')
    
    // Should show "queued" status for bills being generated
    await expect(page.locator('text=Queued').first()).toBeVisible({ timeout: 5000 })
  })
})
```

---

## Acceptance Criteria Checklist

Copy this to QA:

- [ ] `docker-compose up --build` → GET `/api/health` returns 200
- [ ] Admin login → `/admin/daily-entry` loads grid with seed users
- [ ] Entering a value shows instant save and appears in user dashboard
- [ ] Editing consumption older than 7 days returns 403 and writes audit log
- [ ] POST `/api/v1/bills/generate/{user}/{month}` returns 202 with `{"job":"queued"}`
- [ ] After PDF job runs, GET bill returns `pdf_url` which downloads valid PDF
- [ ] Simulated Razorpay webhook marks bill PAID and creates payment record
- [ ] Frontend Lighthouse desktop ≥ 85 on all pages
- [ ] All UI components have Storybook stories with no visual regressions
- [ ] Unit tests pass with ≥ 85% coverage

---

## Deliverables Summary

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Hot-fixes (guards, empty states, skeletons) | Pending |
| 2 | Design system (Tailwind + CSS variables) | Pending |
| 3 | Backend improvements (Decimal, HMAC, audit) | Pending |
| 4 | Frontend architecture (file structure, API client) | Pending |
| 5 | Database migrations (bill_versions, audit) | Pending |
| 6 | CI/CD pipelines (lint, test, Lighthouse) | Pending |
| 7 | E2E tests (Playwright) | Pending |

