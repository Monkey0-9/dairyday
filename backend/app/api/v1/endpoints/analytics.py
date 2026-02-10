
from typing import Any
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard")
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get dashboard analytics including KPIs and trends.

    Returns:
        - kpis: Key performance indicators
        - revenue_trend: Monthly revenue data
        - customer_insights: Customer analytics
    """
    try:
        logger.info(f"Fetching dashboard analytics for admin user: {current_user.id}")

        # Debug logging to trace execution and force reload
        logger.info("Calling AnalyticsService.get_dashboard_kpis...")
        kpis = await AnalyticsService.get_dashboard_kpis(db)
        logger.info(f"KPIs retrieved: {kpis.keys()}")

        logger.info("Calling AnalyticsService.get_revenue_trend...")
        revenue_trend = await AnalyticsService.get_revenue_trend(db, months=12)
        
        logger.info("Calling AnalyticsService.get_customer_insights...")
        customer_insights = await AnalyticsService.get_customer_insights(db)

        return {
            **kpis,
            "revenue_trend": revenue_trend,
            "customer_insights": customer_insights
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )


@router.get("/revenue-trend")
async def get_revenue_trend(
    months: int = 12,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Get revenue trend for specified number of months."""
    try:
        if months < 1 or months > 24:
            raise HTTPException(
                status_code=400,
                detail="Months must be between 1 and 24"
            )

        trend = await AnalyticsService.get_revenue_trend(db, months)
        return trend

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching revenue trend: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve revenue trend: {str(e)}"
        )


@router.get("/customers")
async def get_customer_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Get customer insights and analytics."""
    try:
        insights = await AnalyticsService.get_customer_insights(db)
        return insights

    except Exception as e:
        logger.error(f"Error fetching customer analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve customer analytics: {str(e)}"
        )


@router.get("/forecast")
async def get_revenue_forecast(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Predict next month's revenue."""
    forecast = await AnalyticsService.get_revenue_forecast(db)
    return forecast
