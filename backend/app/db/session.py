from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Enterprise Database Configuration
# We use a stable, single-engine approach to avoid lease/connection overhead

# Determine engine arguments based on database type
engine_args = {
    "future": True,
    "echo": False,
    "pool_pre_ping": True,
    "pool_size": 20,
    "max_overflow": 10,
    "pool_recycle": 3600,
}

if "sqlite" in settings.SQLALCHEMY_DATABASE_URI:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_size"] = settings.DB_POOL_SIZE
    engine_args["max_overflow"] = settings.DB_MAX_OVERFLOW
    # Render and Neon provide connection urls that require SSL.
    # We stripped the query parameters in config.py, so we explicitly enable ssl here.
    engine_args["connect_args"] = {"ssl": True} if "postgresql" in settings.SQLALCHEMY_DATABASE_URI else {}

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    **engine_args
)

async_session = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

# For backward compatibility with some modules
SessionLocal = async_session


async def get_db():
    """Dependency for API endpoints to get a database session."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
