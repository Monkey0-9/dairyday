from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    import razorpay
except ImportError:
    razorpay = None


def get_razorpay_client():
    """Get the Razorpay client. Fails if not configured."""
    if razorpay is None:
        raise RuntimeError("razorpay-python package not installed.")

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            return razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
        except Exception as e:
            logger.error("Failed to initialize Razorpay client: %s", e)
            raise

    raise RuntimeError(
        "Razorpay credentials (RAZORPAY_KEY_ID/SECRET) not found. "
        "Strict mode: Application requires valid keys for startup."
    )
