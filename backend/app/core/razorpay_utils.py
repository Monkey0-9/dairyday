from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    import razorpay
except ImportError:
    razorpay = None

class MockRazorpayClient:
    """Mock Razorpay client for development/testing."""

    def order_create(self, data):
        return {
            "id": "order_mock_" + str(hash(str(data))),
            "amount": data["amount"],
            "currency": data["currency"]
        }

    def utility_verify_payment_signature(self, params):
        return True
    
    def order_fetch(self, order_id):
        # Mock fetch
        return {
            "id": order_id,
            "status": "paid",
            "amount_paid": 10000,
        }
    
    def payment_all(self, params):
        return {"items": []}

def get_razorpay_client():
    """Get the Razorpay client, using mock if not configured."""
    if razorpay is None:
        return MockRazorpayClient()

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        except Exception as e:
            logger.error("Failed to initialize Razorpay client: %s", e)
            return MockRazorpayClient()

    logger.warning("Razorpay keys not found, using Mock Client")
    return MockRazorpayClient()
