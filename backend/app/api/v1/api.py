from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    consumption,
    bills,
    payments,
    admin,
    analytics,
    system,
    support,
    admin_auth,
    ai,
    utr,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_auth.router, prefix="/admin/auth", tags=["admin-auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    consumption.router, prefix="/consumption", tags=["consumption"]
)
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(utr.router, prefix="/utr", tags=["utr"])
