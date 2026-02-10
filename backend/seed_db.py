#!/usr/bin/env python
"""Database initialization script for DairyOS."""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.db.base import Base
from app.models.user import User
from app.core.security import get_password_hash
import random
import datetime
from sqlalchemy import select
from app.models.consumption import Consumption
from decimal import Decimal


def get_local_engine():
    """Get SQLite engine for local development."""
    sqlite_uri = "sqlite+aiosqlite:///./dairy.db"
    return create_async_engine(sqlite_uri, future=True, echo=False)


async def init_models(engine):
    """Initialize database models."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def create_initial_data(engine):
    """Create initial admin user and test users."""
    async with AsyncSession(engine) as session:
        # 1. Create Admin
        result = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        admin = result.scalars().first()
        
        if not admin:
            print("Creating superuser admin@dairy.com")
            admin = User(
                name="Admin User",
                email="admin@dairy.com",
                hashed_password=get_password_hash("admin123"),
                role="ADMIN",
                is_active=True,
                price_per_liter=Decimal("0.0")
            )
            session.add(admin)
            await session.flush()
            print("✓ Admin user created: admin@dairy.com / admin123")
        else:
            print("✓ Admin user already exists: admin@dairy.com")
        
        # 2. Create 10 Users
        users = []
        for i in range(1, 11):
            email = f"user{i}@dairy.com"
            res = await session.execute(select(User).where(User.email == email))
            user = res.scalars().first()
            if not user:
                print(f"Creating user {email}")
                user = User(
                    name=f"Customer {i}",
                    email=email,
                    hashed_password=get_password_hash("password123"),
                    role="USER",
                    is_active=True,
                    price_per_liter=Decimal(str(60.0 + (i * 2)))
                )
                session.add(user)
                await session.flush()
                print(f"✓ User created: {email} / password123")
            else:
                print(f"✓ User already exists: {email}")
            users.append(user)
        
        # 3. Seed Consumption for last 90 days
        today = datetime.date.today()
        consumption_count = 0
        for user in users:
            # Check if user already has consumption data to avoid duplicates
            check = await session.execute(select(Consumption).where(Consumption.user_id == user.id).limit(1))
            if check.scalars().first():
                continue
            
            print(f"Seeding consumption for {user.email}")
            for d in range(1, 91):
                date = today - datetime.timedelta(days=d)
                qty = round(random.uniform(0.5, 4.0), 1)
                # Ensure some days are 0 (no delivery)
                if random.random() < 0.1: 
                    qty = 0.0
                
                # Make older entries locked conceptually
                is_locked = d > 7
                
                session.add(Consumption(
                    user_id=user.id,
                    date=date,
                    quantity=qty,
                    locked=is_locked
                ))
                consumption_count += 1
        
        await session.commit()
        print("\n✓ Initial data created successfully!")
        print(f"✓ Total consumption records: {consumption_count}")


async def main():
    """Main initialization function."""
    print("=" * 50)
    print("DairyOS Database Initialization")
    print("=" * 50)
    print()
    
    print("Initializing database...")
    engine = await init_models(get_local_engine())
    print("Tables created.")
    print()
    
    print("Creating initial data...")
    await create_initial_data(engine)
    print()
    
    print("=" * 50)
    print("Login Credentials:")
    print("-" * 50)
    print("Admin:  admin@dairy.com / admin123")
    print("Users:  user1@dairy.com - user10@dairy.com")
    print("         (password: password123)")
    print("=" * 50)
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

