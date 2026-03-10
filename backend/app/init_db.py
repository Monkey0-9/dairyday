import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.db.base import Base
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings
from sqlalchemy import select


def get_local_engine():
    """Get SQLite engine for local development without PostgreSQL."""
    sqlite_uri = "sqlite+aiosqlite:///./dairy.db"
    return create_async_engine(sqlite_uri, future=True, echo=False)


async def init_models(engine=None):
    """
    Standardized initialization logic. PostgreSQL required.
    """
    if engine is None:
        try:
            from app.db.session import engine as pg_engine

            async with pg_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return pg_engine
        except Exception as e:
            msg = (
                "CRITICAL: Database initialization failed. "
                "PostgreSQL required. Error: " + str(e)
            )
            print(msg)
            raise RuntimeError(msg)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def create_initial_data(engine=None):
    """Create initial admin user and test users."""
    async with AsyncSession(engine) as session:
        async with session.begin():
            # 1. Create/Verify Admin
            admin_email = "admin@dairy.com"
            admin_pwd = settings.ADMIN_PASSWORD
            force_seed = settings.FORCE_ADMIN_SEED

            if admin_pwd == "admin_dev_only_123":
                if os.getenv("ENVIRONMENT") == "production":
                    raise RuntimeError(
                        "CRITICAL: ADMIN_PASSWORD environment variable "
                        "not set in production!"
                    )
                print(
                    "WARNING: Using dev fallback for ADMIN_PASSWORD. "
                    "Set this in .env!"
                )

            result = await session.execute(
                select(User).where(User.email == admin_email)
            )
            admin = result.scalars().first()

            if not admin:
                print(f"Creating superuser {admin_email}")
                admin = User(
                    name="Admin User",
                    email=admin_email,
                    hashed_password=get_password_hash(admin_pwd),
                    role="ADMIN",
                    is_active=True,
                    price_per_liter=0.0,
                )
                session.add(admin)
            else:
                # Elite Standard: Force update admin settings in development/seeding
                if force_seed:
                    from app.core.security import verify_password

                    if not verify_password(admin_pwd, admin.hashed_password):
                        print(f"Updating password for {admin_email}")
                        admin.hashed_password = get_password_hash(admin_pwd)

                    admin.role = "ADMIN"
                    admin.is_active = True
                    session.add(admin)

    print("Initial data (Admin) verified/updated successfully.")


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
