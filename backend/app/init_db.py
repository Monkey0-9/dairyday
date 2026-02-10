import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.db.base import Base
from app.models.user import User
from app.core.security import get_password_hash
import random
import datetime
from sqlalchemy import select
from app.models.consumption import Consumption


def get_local_engine():
    """Get SQLite engine for local development without PostgreSQL."""
    sqlite_uri = "sqlite+aiosqlite:///./dairy.db"
    return create_async_engine(sqlite_uri, future=True, echo=False)


async def init_models(engine=None):
    """Initialize database models."""
    if engine is None:
        # Try PostgreSQL first, fallback to SQLite
        try:
            from app.db.session import engine as pg_engine
            async with pg_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return pg_engine
        except Exception:
            # Use SQLite for local development
            local_engine = get_local_engine()
            async with local_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return local_engine
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return engine


async def create_initial_data(engine=None):
    """Create initial admin user and test users."""
    if engine is None:
        try:
            from app.db.session import engine as pg_engine
            engine = pg_engine
        except Exception:
            engine = get_local_engine()

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
                price_per_liter=0.0
            )
            session.add(admin)
            await session.flush()

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
                    price_per_liter=60.0 + (i * 2) # Vary price slightly
                )
                session.add(user)
                await session.flush()
            users.append(user)

        # 3. Seed Consumption for last 90 days
        today = datetime.date.today()
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
                    locked=is_locked,
                    source='MANUAL'
                ))

        await session.commit()
        print("Initial data created/updated successfully.")


async def main():
    """Main initialization function."""
    print("Initializing database...")
    engine = await init_models()
    print("Tables created.")
    print("Creating initial data...")
    await create_initial_data(engine)
    print("Initial data created.")


if __name__ == "__main__":
    asyncio.run(main())

