from typing import Dict, List, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from app.models.user import User
from app.models.bill import Bill
from app.models.consumption import Consumption
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for generating analytics and business insights."""

    @staticmethod
    async def get_dashboard_kpis(db: AsyncSession) -> Dict[str, Any]:
        """
        Calculate key performance indicators for the dashboard.

        Returns:
            Dict containing:
            - total_revenue: Total revenue (current month)
            - active_customers: Number of active customers
            - pending_payments: Number of pending payments
            - monthly_growth: Revenue growth percentage (month-over-month)
        """
        try:
            now = datetime.now()

            # Previous month dates
            if now.month == 1:
                prev_month = 12
                prev_year = now.year - 1
            else:
                prev_month = now.month - 1
                prev_year = now.year

            start_of_month = now.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            if now.month == 12:
                next_month = now.replace(year=now.year + 1, month=1, day=1)
            else:
                next_month = now.replace(month=now.month + 1, day=1)

            # Current month revenue
            current_revenue_result = await db.execute(
                select(func.coalesce(func.sum(Bill.total_amount), 0))
                .where(
                    and_(
                        Bill.created_at >= start_of_month,
                        Bill.created_at < next_month
                    )
                )
            )
            current_revenue = float(current_revenue_result.scalar() or 0)

            # Previous month dates
            start_of_prev = start_of_month.replace(
                year=prev_year, month=prev_month
            )
            end_of_prev = start_of_month

            # Previous month revenue
            prev_revenue_result = await db.execute(
                select(func.coalesce(func.sum(Bill.total_amount), 0))
                .where(
                    and_(
                        Bill.created_at >= start_of_prev,
                        Bill.created_at < end_of_prev
                    )
                )
            )
            prev_revenue = float(prev_revenue_result.scalar() or 0)

            # Calculate growth
            if prev_revenue > 0:
                monthly_growth = ((current_revenue - prev_revenue) / prev_revenue) * 100
            else:
                monthly_growth = 100 if current_revenue > 0 else 0

            # Active customers
            q = select(func.count(User.id)).where(User.is_active)
            active_customers_result = await db.execute(q)
            active_customers = active_customers_result.scalar() or 0

            # Pending payments (unpaid bills)
            pending_payments_q = select(func.count()).select_from(Bill).where(
                Bill.status == 'UNPAID'
            )
            pending_payments_res = await db.execute(pending_payments_q)
            pending_payments = pending_payments_res.scalar() or 0

            # Total unpaid amount
            unpaid_amount_q = select(func.coalesce(func.sum(Bill.total_amount), 0)).where(
                Bill.status == 'UNPAID'
            )
            unpaid_amount_res = await db.execute(unpaid_amount_q)
            unpaid_amount = float(unpaid_amount_res.scalar() or 0)

            # Today's Intake (from Consumption)
            today = datetime.now().date()
            today_liters_result = await db.execute(
                select(func.coalesce(func.sum(Consumption.quantity), 0))
                .where(Consumption.date == today)
            )
            today_liters = float(today_liters_result.scalar() or 0)

            # New customers this month
            new_customers_result = await db.execute(
                select(func.count(User.id)).where(
                    and_(
                        User.created_at >= start_of_month,
                        User.created_at < next_month
                    )
                )
            )
            new_customers = new_customers_result.scalar() or 0

            msg = (
                f"Dashboard KPIs calculated: revenue={current_revenue}, "
                f"customers={active_customers}, pending={pending_payments}"
            )
            logger.info(msg)

            return {
                "monthly_revenue": current_revenue,
                "previous_revenue": prev_revenue,
                "monthly_growth": round(monthly_growth, 2),
                "total_customers": active_customers,
                "new_customers": new_customers,
                "today_liters": today_liters,
                "pending_bills": pending_payments,
                "unpaid_amount": unpaid_amount,
                "period": now.strftime("%B %Y")
            }

        except Exception as e:
            msg = f"Error calculating dashboard KPIs: {str(e)}"
            logger.error(msg, exc_info=True)
            raise

    @staticmethod
    async def get_revenue_trend(
        db: AsyncSession,
        months: int = 12
    ) -> List[Dict[str, Any]]:
        """
        Get monthly revenue trend for the specified number of months.

        Args:
            months: Number of months to retrieve (default 12)

        Returns:
            List of dicts with month and revenue data
        """
        try:
            now = datetime.now()
            trends = []

            for i in range(months - 1, -1, -1):
                # Calculate the target month
                target_month = now.month - i
                target_year = now.year

                while target_month <= 0:
                    target_month += 12
                    target_year -= 1

                # Get revenue for this month
                revenue_result = await db.execute(
                    select(func.coalesce(func.sum(Bill.total_amount), 0))
                    .where(
                        and_(
                            extract('year', Bill.created_at) == target_year,
                            extract('month', Bill.created_at) == target_month
                        )
                    )
                )
                revenue = float(revenue_result.scalar() or 0)

                start_of_target = datetime(target_year, target_month, 1)
                month_name = start_of_target.strftime("%b %Y")
                trends.append({
                    "month": month_name,
                    "revenue": revenue,
                    "year": target_year,
                    "month_number": target_month
                })

            logger.info(f"Revenue trend calculated for {months} months")
            return trends

        except Exception as e:
            msg = f"Error calculating revenue trend: {str(e)}"
            logger.error(msg, exc_info=True)
            raise

    @staticmethod
    async def get_revenue_forecast(db: AsyncSession) -> Dict[str, Any]:
        """
        Predict next month's revenue using a simple moving average.

        Returns:
            Dict with forecast value and confidence indicators.
        """
        try:
            trends = await AnalyticsService.get_revenue_trend(db, months=3)
            revenues = [t["revenue"] for t in trends if t["revenue"] > 0]

            if not revenues:
                return {"forecast_amount": 0, "confidence": "low", "method": "SMA-3"}

            avg_revenue = sum(revenues) / len(revenues)
            # Add a slight growth bias (2%)
            forecast = avg_revenue * 1.02

            confidence = "medium" if len(revenues) >= 3 else "low"
            return {
                "forecast_amount": round(forecast, 2),
                "confidence": confidence,
                "method": "SMA-3",
                "period": "Next Month"
            }
        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            return {"forecast_amount": 0, "error": "Calculation failed"}

    @staticmethod
    async def get_customer_insights(db: AsyncSession) -> Dict[str, Any]:
        """
        Get customer segmentation and insights.

        Returns:
            Dict with customer analytics
        """
        try:
            # Total customers
            total_result = await db.execute(select(func.count(User.id)))
            total = total_result.scalar() or 0

            # Active vs Inactive
            active_result = await db.execute(
                select(func.count(User.id)).where(User.is_active)
            )
            active = active_result.scalar() or 0
            inactive = total - active

            # Average revenue per user (ARPU)
            try:
                revenue_q = select(func.coalesce(func.sum(Bill.total_amount), 0))
                revenue_res = await db.execute(revenue_q)
                total_revenue = float(revenue_res.scalar() or 0)
                arpu = total_revenue / active if active > 0 else 0
            except Exception as e:
                logger.error(f"Error calculating ARPU: {e}")
                arpu = 0

            logger.info("Customer insights calculated")

            activation_rate = (active / total * 100) if total > 0 else 0
            return {
                "total_customers": total,
                "active_customers": active,
                "inactive_customers": inactive,
                "arpu": round(arpu, 2),
                "activation_rate": round(activation_rate, 2)
            }

        except Exception as e:
            msg = f"Error calculating customer insights: {str(e)}"
            logger.error(msg, exc_info=True)
            raise
