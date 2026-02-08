# DairyOS - Implementation Guide

## Simplified Requirements (Based on Latest Input)

### User Roles
| Role | Capabilities |
|------|-------------|
| **ADMIN** (1 person) | Full control - add customers, enter daily milk, generate bills, view payments |
| **CUSTOMER** | Read-only - view own milk history, see bill, pay online |

### Core Flow (Exactly as Specified)

#### 1. Daily Milk Entry (Admin Only - Most Important)
```
Admin login → Daily Entry page (default home)
├─ Select customer (searchable dropdown)
├─ Select date (calendar picker, defaults to today)
├─ Enter total liters (decimal, e.g., 1.75)
└─ Save → Success → Enter next customer
```

#### 2. Customer View (Clean & Read-Only)
```
Customer login → Single dashboard page
├─ Header: "Your Milk This Month" (Month + Year)
├─ Table: Date | Liters
├─ Footer:
│  ├─ Total this month: X liters
│  ├─ Bill amount: ₹X (at ₹Y/liter)
│  ├─ Status: UNPAID / PAID
│  └─ [PAY NOW] button (if unpaid)
└─ No edit icons, no forms, pure information
```

#### 3. Bill Generation
```
Admin clicks "Generate Bills" for month
├─ Sum all milk_records for each customer (by month)
├─ amount = total_liters × price_per_liter
├─ Create bill row with status = 'UNPAID'
└─ Lock bills (no edit after generation)
```

#### 4. Payment Flow
```
Customer clicks Pay Now
├─ Backend creates Razorpay order (paise)
├─ Frontend opens Razorpay checkout
├─ On success → webhook → mark PAID + save payment
└─ Admin sees payment in payments table
```

---

## Database Schema (Exactly as Specified)

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| name | VARCHAR | Customer/admin name |
| email | VARCHAR UNIQUE | Login email |
| password_hash | VARCHAR | bcrypt hash |
| role | VARCHAR | 'admin' or 'customer' |
| phone | VARCHAR | Optional phone |
| created_at | TIMESTAMP | Creation time |

### milk_records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| user_id | UUID FK → users | Customer ID |
| date | DATE | Delivery date |
| liters | DECIMAL(5,2) | Total liters for that day |
| created_at | TIMESTAMP | Record creation |
| UNIQUE(user_id, date) | Constraint | One entry per customer per day |

### bills
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| user_id | UUID FK → users | Customer ID |
| month | VARCHAR(7) | 'YYYY-MM' format |
| total_liters | DECIMAL(10,2) | Sum of milk for month |
| rate_per_liter | DECIMAL(6,2) | Rate at generation time |
| amount | DECIMAL(10,2) | total_liters × rate |
| status | VARCHAR | 'UNPAID' or 'PAID' |
| generated_at | TIMESTAMP | When bill was created |
| UNIQUE(user_id, month) | Constraint | One bill per customer per month |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| bill_id | UUID FK → bills | Related bill |
| razorpay_payment_id | VARCHAR | Payment gateway ID |
| amount | DECIMAL(10,2) | Payment amount |
| status | VARCHAR | 'success' |
| paid_at | TIMESTAMP | Payment timestamp |

---

## API Endpoints (Simplified)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login with email + password |
| POST | /auth/logout | Logout (clear session) |
| POST | /auth/change-password | Change password |

### Milk Records (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/milk-entry | List all milk entries (filter by date/customer) |
| POST | /admin/milk-entry | Create new milk entry |
| PUT | /admin/milk-entry/{id} | Update existing entry |
| DELETE | /admin/milk-entry/{id} | Delete entry |

### Customers (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/customers | List all customers |
| POST | /admin/customers | Add new customer |
| PUT | /admin/customers/{id} | Update customer |
| DELETE | /admin/customers/{id} | Deactivate customer |

### Bills (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /admin/bills/generate | Generate bills for month |
| GET | /admin/bills | List all bills (filter by month) |
| GET | /admin/bills/{id} | Get bill details |

### Customer APIs (Read-Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /customer/milk | Get customer's milk records |
| GET | /customer/bill | Get current month bill |
| GET | /customer/payments | Get payment history |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /payments/create-order/{bill_id} | Create Razorpay order |
| POST | /payments/webhook | Razorpay webhook handler |

---

## Implementation Priority

### P0 - Critical (Must Have)
1. ✅ JWT Authentication with role-based access
2. ✅ Admin login + Customer login separate
3. ✅ Admin: Daily milk entry (date + liters)
4. ✅ Customer: Read-only view of own milk
5. ✅ Bill generation (monthly auto-sum)
6. ✅ Razorpay payment integration
7. ✅ Strict RBAC (customer → admin route = 403)

### P1 - Important
1. Session timeout (30 min inactivity)
2. Rate limiting on auth endpoints
3. Bill status tracking for admin
4. Payment history view for admin

### P2 - Nice to Have
1. Customer audit log view
2. Email notifications for bills
3. Bulk CSV upload for milk entries
4. Export reports to Excel

---

## Current Codebase Assessment

Based on code review, the current system has:
- ✅ JWT authentication (needs session expiry)
- ✅ Consumption table (single `quantity` field - matches requirement!)
- ✅ Bills with status
- ✅ Payments tracking
- ✅ Admin/Customer role separation (needs stricter enforcement)

**What needs fixing:**
1. Make customer view truly read-only
2. Add session expiry
3. Add rate limiting
4. Simplify UI to be cleaner
5. Remove unnecessary complexity

---

## File Changes Required

### Backend
1. `app/core/security.py` - Add session expiry
2. `app/api/v1/endpoints/auth.py` - Add rate limiting
3. `app/api/v1/endpoints/consumption.py` - Add admin-only middleware
4. `app/services/billing.py` - Ensure proper bill generation

### Frontend
1. `app/admin/daily-entry/page.tsx` - Clean up, simplify
2. `app/user/dashboard/page.tsx` - Make read-only
3. `app/page.tsx` - Professional landing page
4. `app/admin/login/page.tsx` - Clean admin login
5. `app/user/login/page.tsx` - Clean customer login

---

## Success Criteria

| Criterion | Target |
|-----------|--------|
| Customer cannot access admin pages | 100% enforced |
| Login security | JWT + bcrypt + rate limiting |
| Session timeout | 30 minutes inactivity |
| Bill accuracy | Auto-sum from milk records |
| Payment success | Razorpay webhook integration |
| UI simplicity | No extra buttons/forms for customers |

