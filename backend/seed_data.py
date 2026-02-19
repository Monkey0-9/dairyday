"""
Seeding Script for DairyDay.
Populates the database with realistic demo data for testing and demonstration.

Content:
- 10 Active Customers with Indian names
- Consumption records for Jan 2026 (Historical) and Feb 2026 (Current)
- Bills for Jan 2026 (Mixed PAID/UNPAID)
- Bills for Feb 2026 (UNPAID)
- Payments (Cash & Razorpay)
"""
import asyncio
import sys
import random
import logging
from datetime import date, timedelta, datetime
from decimal import Decimal

sys.path.insert(0, ".")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seeder")

names = [
    "Aarav Patel", "Vihaan Rao", "Aditya Sharma", "Sai Kumar", "Arjun Singh",
    "Reyansh Gupta", "Muhammad Khan", "Krishna Reddy", "Ishaan Verma", "Sarthak Nair"
]

def get_random_phone():
    return f"9{random.randint(100000000, 999999999)}"

async def seed():
    from app.db.session import SessionLocal, engine
    from app.models.user import User
    from app.models.consumption import Consumption
    from app.models.bill import Bill
    from app.models.payment import Payment
    from app.core.security import get_password_hash
    from app.services.billing import generate_bill_for_user
    from sqlalchemy import select, text

    print("🌱 Starting Database Seeding...", flush=True)

    async with SessionLocal() as db:
        try:
            # Test connection
            await db.execute(text("SELECT 1"))
            
            # 1. Ensure Admin Exists
            print("  Checking Admin...", flush=True)
            result = await db.execute(select(User).where(User.email == "admin@dairyday.in"))
            admin = result.scalars().first()
            if not admin:
                print("  Creating Admin...", flush=True)
                admin = User(
                    name="System Admin",
                    email="admin@dairyday.in",
                    phone="9999999999",
                    hashed_password=get_password_hash("admin123"),
                    role="ADMIN",
                    is_active=True,
                    price_per_liter=Decimal("60.0"),
                    daily_target_qty=Decimal("0.0")
                )
                db.add(admin)
                await db.commit()
            
            # 2. Create Customers
            users = []
            print(f"  Checking {len(names)} Customers...", flush=True)
            for i, name in enumerate(names):
                email = f"user{i+1}@dairy.in"
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalars().first()
                
                if not user:
                    # print(f"    Creating {name}...", flush=True)
                    user = User(
                        name=name,
                        email=email,
                        phone=get_random_phone(),
                        hashed_password=get_password_hash("user123"),
                        role="USER",
                        is_active=True,
                        price_per_liter=Decimal(str(random.choice([55.0, 60.0, 62.0]))),
                        daily_target_qty=Decimal(str(random.choice([1.0, 1.5, 2.0, 3.0])))
                    )
                    db.add(user)
                    await db.commit()
                    await db.refresh(user)
                users.append(user)

            # 3. Generate Consumption & Bills
            months = [
                (2026, 1, 31), # Jan
                (2026, 2, 28)  # Feb
            ]

            today = date.today()

            for user in users:
                print(f"  Processing data for {user.name}...", flush=True)
                
                for year, month, days_in_month in months:
                    month_str = f"{year}-{month:02d}"
                    
                    # Generate Consumption
                    current_qty = float(user.daily_target_qty)
                    
                    # Optimization: Check if data exists for this month roughly
                    start_date = date(year, month, 1)
                    res = await db.execute(select(Consumption).where(
                        Consumption.user_id == user.id,
                        Consumption.date == start_date
                    ))
                    if res.scalars().first():
                        # Assume already seeded for this month
                        continue

                    for day in range(1, days_in_month + 1):
                        c_date = date(year, month, day)
                        if c_date > today:
                            break
                            
                        # Randomize
                        if random.random() < 0.1: 
                            current_qty = random.choice([0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
                        
                        qty = Decimal(str(current_qty))
                        if random.random() < 0.05:
                            qty = Decimal("0.0")

                        c = Consumption(
                            user_id=user.id,
                            date=c_date,
                            quantity=qty,
                            status="DELIVERED" if qty > 0 else "SKIPPED"
                        )
                        db.add(c)
                    
                    await db.commit()

                    # Generate Bill
                    if month == 1 or (month == 2 and today.day > 15):
                        # check if bill exists
                        res = await db.execute(select(Bill).where(
                            Bill.user_id == user.id,
                            Bill.month == month_str
                        ))
                        if res.scalars().first():
                            continue

                        # print(f"    Generating bill {month_str}...", flush=True)
                        bill = await generate_bill_for_user(db, user.id, month_str)
                        
                        if bill and month == 1:
                            if random.random() < 0.8:
                                if bill.status != "PAID":
                                    bill.status = "PAID"
                                    bill.updated_at = datetime.now()
                                    db.add(bill)
                                    
                                    payment = Payment(
                                        bill_id=bill.id,
                                        provider="CASH" if random.random() < 0.5 else "razorpay",
                                        provider_payment_id=f"pay_{random.randint(10000,99999)}",
                                        amount=bill.total_amount,
                                        status="SUCCESS",
                                        paid_at=datetime.now()
                                    )
                                    db.add(payment)
                                    await db.commit()
    
        except Exception as e:
            print(f"❌ Seeding Error: {e}", flush=True)
            import traceback
            traceback.print_exc()
    
    print("✅ Seeding Logic Data Complete.", flush=True)
    
    # Dispose engine to close connections
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
