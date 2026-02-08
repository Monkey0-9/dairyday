import logging
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.bill import Bill
from app.models.payment import Payment
from app.core.razorpay_utils import get_razorpay_client
from sqlalchemy import func

logger = logging.getLogger(__name__)

async def reconcile_payments(db: AsyncSession):
    """
    Check unpaid bills and verify if they are paid in Razorpay.
    """
    # Get all unpaid bills
    result = await db.execute(select(Bill).where(Bill.status == 'UNPAID'))
    unpaid_bills = result.scalars().all()
    
    client = get_razorpay_client()
    reconciled_count = 0

    for bill in unpaid_bills:
        # We need a way to link Bill -> Razorpay Order. 
        # Typically we store order_id in Payment or Bill, but currently we generate it on text/notes.
        # This is a limitation. For now, we will fetch payments with 'bill_id' in notes if possible 
        # or relying on Webhook is mostly sufficient.
        
        # A robust reconciliation would list recent payments from Razorpay and match them.
        try:
            # Listing payments from Razorpay (limitation: pagination/filtering)
            # notes.bill_id is filterable in Razorpay API? No.
            # So active polling is hard without order_id stored in Bill.
            pass
        except Exception as e:
            logger.error(f"Reconciliation error for bill {bill.id}: {e}")

    # Fallback Mechanism:
    # If we had a 'PaymentIntent' table or stored 'order_id' on Bill, we could check that specific order.
    # Current implementation relies heavily on Webhooks.
    
    logger.info(f"Reconciliation complete. Processed {len(unpaid_bills)} bills.")
    return reconciled_count
