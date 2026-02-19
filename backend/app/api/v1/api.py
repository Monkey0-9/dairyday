
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, users, consumption, bills, payments, admin, analytics, registration, system, support
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(consumption.router, prefix="/consumption", tags=["consumption"])
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(registration.router, prefix="/registration", tags=["registration"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(support.router, prefix="/support", tags=["support"])
