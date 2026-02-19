import os
from app.core.config import settings

print(f"BACKEND_CORS_ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
print(f"DATABASE_URL: {settings.DATABASE_URL}")
print(f"PROJECT_NAME: {settings.PROJECT_NAME}")
