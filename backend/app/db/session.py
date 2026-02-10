
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Enterprise Database Configuration
# We use a stable, single-engine approach to avoid lease/connection overhead

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI, 
    future=True, 
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.SQLALCHEMY_DATABASE_URI else {}
)

async_session = sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False
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
