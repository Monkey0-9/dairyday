
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import datetime
from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.core.security import get_password_hash

engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
async_session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    _engine = engine
    # Test if primary engine is reachable
    try:
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        # Fallback Engine
        sqlite_uri = "sqlite+aiosqlite:///./dairy.db"
        _engine = create_async_engine(sqlite_uri, future=True, echo=False)
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # Yield Session
    async_session = sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Seed if SQLite and empty
        if "sqlite" in str(_engine.url):
            res = await session.execute(text("SELECT 1 FROM users WHERE email = 'admin@dairy.com'"))
            if not res.scalar():
                from app.core.security import get_password_hash
                session.add(User(
                    name="Admin User", email="admin@dairy.com",
                    hashed_password=get_password_hash("admin123"),
                    role="ADMIN", is_active=True, price_per_liter=0.0
                ))
                await session.commit()
        yield session
