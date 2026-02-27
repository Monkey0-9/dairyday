
import asyncio
from app.services.notification_service import NotificationService
from app.core.config import settings
import unittest.mock as mock

async def test_smtp_logic():
    print("Testing NotificationService SMTP Selection Logic...")
    
    # Test 1: No SMTP settings (Simulation Mode)
    print("\n[Test 1] No SMTP settings (Should be SIMULATED)")
    with mock.patch("app.core.config.settings.SMTP_HOST", None):
        success = await NotificationService.send_email(
            to_email="test@example.com",
            subject="Test Simulation",
            template_name="test",
            context={}
        )
        print(f"Result: {'Success' if success else 'Failed'}")

    # Test 2: SMTP settings present (Real SMTP attempt)
    print("\n[Test 2] SMTP settings present (Should be REAL)")
    with mock.patch("app.core.config.settings.SMTP_HOST", "smtp.gmail.com"), \
         mock.patch("app.core.config.settings.SMTP_USER", "user@gmail.com"), \
         mock.patch("app.core.config.settings.SMTP_PASSWORD", "secret"), \
         mock.patch("aiosmtplib.send", new_callable=mock.AsyncMock) as mock_send:
        
        success = await NotificationService.send_email(
            to_email="test@example.com",
            subject="Test Real",
            template_name="test",
            context={}
        )
        print(f"Result: {'Success' if success else 'Failed'}")
        if mock_send.called:
            print("Verified: aiosmtplib.send was called!")
        else:
            print("Failed: aiosmtplib.send was NOT called!")

if __name__ == "__main__":
    asyncio.run(test_smtp_logic())
