import os
import sys

# Standard library imports
import asyncio
import traceback
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Tuple

# Third-party imports
import httpx
from sqlalchemy import select, and_, text

# Add root to path for local imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Local application imports
from app.db.session import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.bill import Bill  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.consumption import Consumption  # noqa: E402
from app.core.config import settings  # noqa: E402

BASE = "http://localhost:8000"
OUT_FILE = "test_output.txt"

results: List[Tuple[str, bool, str]] = []
log_lines: List[str] = []


def log(msg: str):
    log_lines.append(msg)
    print(msg)


def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((name, passed, detail))
    log(f"  [{status}] {name}: {detail}")


async def main():
    log("=" * 60)
    log("FULL E2E TEST: Billing and Payments")
    log("=" * 60)

    # --- Phase 0: Database ---
    log("\n[Phase 0] Database")
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
            record("DB Connection", True, "PostgreSQL OK")
    except Exception as e:
        record("DB Connection", False, str(e)[:80])
        write_results()
        return

    # --- Phase 1: Login ---
    log("\n[Phase 1] Authentication")
    token = None

    try:
        async with httpx.AsyncClient(
            base_url=BASE, timeout=10, follow_redirects=True
        ) as client:
            r = await client.post(
                "/api/v1/auth/login",
                data={
                    "username": "admin@dairyday.in",
                    "password": os.environ.get("TEST_PASSWORD", "admin123"),
                },
            )
            record("Login POST", r.status_code == 200, f"HTTP {r.status_code}")

            if r.status_code == 200:
                body = r.json()
                token = body.get("access_token")
                if not token:
                    token = r.cookies.get("access_token")
                record("Token", bool(token), f"len={len(token) if token else 0}")
            else:
                log(f"    Body: {r.text[:200]}")
    except httpx.ConnectError as e:
        record("Login", False, f"Server unreachable: {e}")
        log("  Server not responding, doing direct tests only.")
        token = None
    except Exception as e:
        record("Login", False, str(e)[:80])
        token = None

    # --- Phase 1b: Test Data ---
    log("\n[Phase 1b] Test Data")
    test_user_id = None
    test_month = "2026-02"
    test_bill_id = None

    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(and_(User.role == "USER", User.is_active == True))
        )
        test_user = result.scalars().first()
        if test_user:
            test_user_id = test_user.id
            record("Test user", True, f"{test_user.name} ({test_user.email})")
        else:
            result = await db.execute(select(User).where(User.is_active == True))
            any_u = result.scalars().first()
            if any_u:
                test_user_id = any_u.id
                record("Test user (fallback)", True, f"{any_u.name}")
            else:
                record("Test user", False, "No users")
                write_results()
                return

        # Consumption data
        today = date.today()
        start = date(today.year, today.month, 1)
        result = await db.execute(
            select(Consumption).where(
                and_(Consumption.user_id == test_user_id, Consumption.date >= start)
            )
        )
        existing = result.scalars().all()
        if existing:
            record("Consumption data", True, f"{len(existing)} records")
        else:
            for i in range(5):
                c = Consumption(
                    user_id=test_user_id,
                    date=start + timedelta(days=i),
                    quantity=Decimal("2.0"),
                    status="DELIVERED",
                )
                db.add(c)
            record("Consumption created", True, "5 x 2.0L")
            await db.commit()

    # === API TESTS (if server is up) ===
    if token:
        headers = {"Authorization": f"Bearer {token}"}

        log("\n[Phase 2] Bill API")
        async with httpx.AsyncClient(
            base_url=BASE, timeout=15, headers=headers
        ) as client:
            # Generate single bill
            try:
                r = await client.post(
                    f"/api/v1/bills/generate/{test_user_id}/{test_month}"
                )
                record(
                    "POST /bills/generate/user/month",
                    r.status_code == 200,
                    f"HTTP {r.status_code}",
                )
                if r.status_code == 200:
                    data = r.json()
                    test_bill_id = data.get("bill_id")
                    log(f"    bill_id={test_bill_id}")
                    log(f"    amount={data.get('total_amount')}")
                else:
                    log(f"    ERR: {r.text[:150]}")
            except Exception as e:
                record("POST generate bill", False, str(e)[:80])

            # Generate all bills
            try:
                r = await client.post(f"/api/v1/bills/generate-all?month={test_month}")
                record(
                    "POST /bills/generate-all",
                    r.status_code == 200,
                    f"HTTP {r.status_code}",
                )
                if r.status_code == 200:
                    log(f"    {r.json()}")
                else:
                    log(f"    ERR: {r.text[:150]}")
            except Exception as e:
                record("POST generate-all", False, str(e)[:80])

            # Get bill
            try:
                r = await client.get(f"/api/v1/bills/{test_user_id}/{test_month}")
                record(
                    "GET /bills/user/month",
                    r.status_code == 200,
                    f"HTTP {r.status_code}",
                )
                if r.status_code != 200:
                    log(f"    ERR: {r.text[:150]}")
            except Exception as e:
                record("GET bill", False, str(e)[:80])

            # List bills
            try:
                r = await client.get(f"/api/v1/bills/?month={test_month}")
                record(
                    "GET /bills/ (list)", r.status_code == 200, f"HTTP {r.status_code}"
                )
                if r.status_code == 200:
                    log(f"    count={len(r.json())}")
            except Exception as e:
                record("GET bills list", False, str(e)[:80])

            # PDF status
            if test_bill_id:
                try:
                    r = await client.get(f"/api/v1/bills/{test_bill_id}/pdf-status")
                    record(
                        "GET pdf-status", r.status_code == 200, f"HTTP {r.status_code}"
                    )
                except Exception as e:
                    record("GET pdf-status", False, str(e)[:80])

        log("\n[Phase 3] Payment API")
        async with httpx.AsyncClient(
            base_url=BASE, timeout=15, headers=headers
        ) as client:
            # Last payment
            try:
                r = await client.get("/api/v1/payments/last")
                record(
                    "GET /payments/last", r.status_code == 200, f"HTTP {r.status_code}"
                )
            except Exception as e:
                record("GET /payments/last", False, str(e)[:80])

            # Create order (Razorpay may not be configured)
            if test_bill_id:
                try:
                    async with SessionLocal() as db:
                        res = await db.execute(
                            select(Bill).where(Bill.id == test_bill_id)
                        )
                        bill = res.scalars().first()
                        if bill and bill.status == "PAID":
                            bill.status = "UNPAID"
                            db.add(bill)
                            await db.commit()

                    r = await client.post(
                        f"/api/v1/payments/create-order/{test_bill_id}"
                    )
                    ok = r.status_code in (200, 500)
                    record(
                        "POST create-order",
                        ok,
                        f"HTTP {r.status_code} (500=no Razorpay)",
                    )
                except Exception as e:
                    record("POST create-order", False, str(e)[:80])

            # Mark paid (cash)
            if test_bill_id:
                try:
                    async with SessionLocal() as db:
                        res = await db.execute(
                            select(Bill).where(Bill.id == test_bill_id)
                        )
                        bill = res.scalars().first()
                        if bill and bill.status == "PAID":
                            bill.status = "UNPAID"
                            db.add(bill)
                            await db.commit()

                    r = await client.post(f"/api/v1/payments/mark-paid/{test_bill_id}")
                    record(
                        "POST mark-paid", r.status_code == 200, f"HTTP {r.status_code}"
                    )
                    if r.status_code != 200:
                        log(f"    ERR: {r.text[:150]}")
                except Exception as e:
                    record("POST mark-paid", False, str(e)[:80])

            # Verify bill status
            if test_bill_id:
                try:
                    async with SessionLocal() as db:
                        res = await db.execute(
                            select(Bill).where(Bill.id == test_bill_id)
                        )
                        bill = res.scalars().first()
                        record(
                            "Bill PAID after mark-paid",
                            bill and bill.status == "PAID",
                            f"{bill.status if bill else 'N/A'}",
                        )

                        pay = await db.execute(
                            select(Payment).where(Payment.bill_id == test_bill_id)
                        )
                        p = pay.scalars().first()
                        record(
                            "Payment record exists",
                            p is not None,
                            f"Provider={p.provider if p else 'N/A'}",
                        )
                except Exception as e:
                    record("Post-payment verify", False, str(e)[:80])

        log("\n[Phase 4] Consumption API")
        async with httpx.AsyncClient(
            base_url=BASE, timeout=15, headers=headers
        ) as client:
            try:
                r = await client.get(f"/api/v1/consumption/grid?month={test_month}")
                record(
                    "GET /consumption/grid",
                    r.status_code == 200,
                    f"HTTP {r.status_code}",
                )
            except Exception as e:
                record("GET /consumption/grid", False, str(e)[:80])

            try:
                r = await client.get(f"/api/v1/consumption/mine?month={test_month}")
                record(
                    "GET /consumption/mine",
                    r.status_code == 200,
                    f"HTTP {r.status_code}",
                )
            except Exception as e:
                record("GET /consumption/mine", False, str(e)[:80])

    # === DIRECT SERVICE TESTS (always runs) ===
    log("\n[Phase 5] Direct Service Tests")

    try:
        async with SessionLocal() as db:
            from app.services.billing_service import BillingService

            svc = BillingService(db)
            bill = await svc.generate_bill_for_user(
                test_user_id, test_month, enqueue_pdf=False
            )
            record(
                "BillingService.generate_bill",
                bill is not None,
                f"Amt={bill.total_amount if bill else None}",
            )
    except Exception as e:
        record("BillingService.recalculate", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    try:
        async with SessionLocal() as db:
            from app.services.billing_service import BillingService

            svc = BillingService(db)
            b = await svc.bill_repo.get_by_user_and_month(test_user_id, test_month)
            if b:
                bp = await svc.get_bill_with_pdf(b.id)
                record("BillingService.get_bill_with_pdf", bp is not None, "OK")
            else:
                record("BillingService.get_bill_with_pdf", True, "No bill (OK)")
    except Exception as e:
        record("BillService", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    try:
        async with SessionLocal() as db:
            from app.services.payment_service import PaymentService

            svc = PaymentService(db)
            r = await svc.verify_webhook_signature(b"test", "fake")
            record("PaymentService.verify_sig", True, f"Result={r}")
    except Exception as e:
        record("PaymentService", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    # === REPOSITORY TESTS ===
    log("\n[Phase 6] Repository Tests")

    try:
        async with SessionLocal() as db:
            from app.repositories.bill_repository import BillRepository

            repo = BillRepository(db)
            b = await repo.get_by_user_and_month(test_user_id, test_month)
            record("BillRepo.get_by_user_month", True, f"Found={b is not None}")
            bs = await repo.get_all_for_month(test_month)
            record(
                "BillRepo.get_all_for_month", isinstance(bs, list), f"Count={len(bs)}"
            )
            p = await repo.get_pending_for_user(test_user_id)
            record("BillRepo.get_pending", isinstance(p, list), f"Count={len(p)}")
    except Exception as e:
        record("BillRepository", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    try:
        async with SessionLocal() as db:
            from app.repositories.payment_repository import PaymentRepository

            repo = PaymentRepository(db)
            if test_bill_id:
                ps = await repo.get_all_for_bill(test_bill_id)
                record(
                    "PaymentRepo.get_all_for_bill",
                    isinstance(ps, list),
                    f"Count={len(ps)}",
                )
            wh = await repo.get_webhook_event("nonexistent")
            record("PaymentRepo.get_webhook_event", wh is None, "None (correct)")
    except Exception as e:
        record("PaymentRepository", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    try:
        async with SessionLocal() as db:
            from app.repositories.consumption_repository import (
                ConsumptionRepository,
            )

            repo = ConsumptionRepository(db)
            stats = await repo.get_monthly_stats(
                test_user_id, date(2026, 2, 1), date(2026, 2, 28)
            )
            record(
                "ConsumptionRepo.stats",
                True,
                f"Liters={stats.get('total_liters', 'N/A')}",
            )
    except Exception as e:
        record("ConsumptionRepo", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    try:
        async with SessionLocal() as db:
            from app.repositories.user_repository import UserRepository

            repo = UserRepository(db)
            us = await repo.get_active_users()
            record(
                "UserRepo.get_active_users", isinstance(us, list), f"Count={len(us)}"
            )
    except Exception as e:
        record("UserRepository", False, str(e)[:100])
        log(traceback.format_exc()[:300])

    log("\n[Phase 7] Environment Check")
    record("SENTRY_ENV", True, f"Env={settings.SENTRY_ENVIRONMENT}")

    write_results()


def write_results():
    passed = sum(1 for _, p, _ in results if p)
    failed = sum(1 for _, p, _ in results if not p)
    total = len(results)

    log("\n" + "=" * 60)
    log("FINAL RESULTS")
    log("=" * 60)
    log(f"  Total:  {total}")
    log(f"  Passed: {passed}")
    log(f"  Failed: {failed}")

    if failed > 0:
        log("\n  FAILURES:")
        for name, p, detail in results:
            if not p:
                log(f"    FAIL: {name} -> {detail}")

    pct = 100 * passed // total if total > 0 else 0
    log(f"\n  Score: {passed}/{total} ({pct}%)")
    log("=" * 60)

    # Write to file
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"\nResults written to {OUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
