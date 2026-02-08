#!/usr/bin/env python3
"""
Seed script for Dairy Management System.
Creates sample users and consumption data for development and testing.
"""

import asyncio
import random
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.db.session import async_session
from app.models.user import User
from app.models.consumption import Consumption
from app.core.security import get_password_hash


async def seed_data():
    """Seed the database with sample data."""
    print("🔌 Connecting to database...")
    
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == "admin@dairy.com")
        )
        if result.scalars().first():
            print("✅ Seed data already exists")
            return

        print("👤 Creating admin user...")
        admin = User(
            id=uuid4(),
            email="admin@dairy.com",
            hashed_password=get_password_hash("admin123"),
            name="Admin User",
            role="ADMIN",
            price_per_liter=Decimal("50.00"),
            is_active=True
        )
        session.add(admin)
        await session.flush()

        # Create 10 test users with consumption data
        print("👥 Creating 10 test users...")
        users = []
        today = date.today()
        
        for i in range(1, 11):
            user = User(
                id=uuid4(),
                email=f"user{i}@dairy.com",
                hashed_password=get_password_hash("user123"),
                name=f"Customer {i}",
                role="USER",
                price_per_liter=Decimal("50.00"),
                is_active=True
            )
            users.append(user)
            session.add(user)
        
        await session.commit()
        print(f"✅ Created {len(users)} users")

        # Add consumption for last 30 days
        print("📊 Generating consumption data for last 30 days...")
        total_records = 0
        
        for user in users:
            for day_offset in range(30):
                consumption_date = today - timedelta(days=day_offset)
                # Vary quantity: 5L to 14L based on day
                quantity = Decimal(str(round(5 + (day_offset % 10), 3)))
                
                consumption = Consumption(
                    id=uuid4(),
                    user_id=user.id,
                    date=consumption_date,
                    quantity=quantity,
                    locked=consumption_date < today - timedelta(days=7)
                )
                session.add(consumption)
                total_records += 1
        
        await session.commit()
        
        print("✅ Seed data created successfully!")
        print("\n📋 Login Credentials:")
        print("   Admin: admin@dairy.com / admin123")
        print("   Users: user1@dairy.com - user10@dairy.com / user123")
        print(f"\n📈 Generated {total_records} consumption records")


if __name__ == "__main__":
    asyncio.run(seed_data())

