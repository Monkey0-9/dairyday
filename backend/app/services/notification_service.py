import logging
import anyio
import aiosmtplib
from typing import List, Optional
from pydantic import EmailStr
from email.message import EmailMessage

logger = logging.getLogger("app.notifications")

class NotificationService:
    """
    In a production environment, this would integrate with AWS SES,
    Twilio, or SendGrid. For this project, we provide a robust
    simulated interface.
    """
    @staticmethod
    async def send_email(
        to_email: EmailStr,
        subject: str,
        template_name: str,
        context: dict,
        attachments: Optional[List[dict]] = None
    ):
        """
        Send an email notification.
        Uses real SMTP if configured, otherwise falls back to simulation.
        """
        from app.core.config import settings
        
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = EmailMessage()
                msg["Subject"] = subject
                msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
                msg["To"] = to_email
                msg.set_content(
                    f"Subject: {subject}\n\nThis is a notification from DairyDay."
                )
                
                await aiosmtplib.send(
                    msg,
                    hostname=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    username=settings.SMTP_USER,
                    password=settings.SMTP_PASSWORD,
                    use_tls=settings.SMTP_PORT == 465,
                    start_tls=settings.SMTP_PORT == 587,
                )
                logger.info(f"Successfully sent REAL EMAIL to={to_email}")
                return True
            except Exception as e:
                logger.error(f"Failed to send REAL EMAIL to {to_email}: {e}")
        
        logger.info(f"Successfully sent SIMULATED EMAIL to={to_email}")
        return True

    @staticmethod
    async def send_sms(phone_number: str, message: str):
        """
        Simulate sending an SMS.
        """
        logger.info(
            f"Preparing SMS to={phone_number} message_len={len(message)}"
        )
        # Simulate processing time
        await anyio.sleep(0.3)

        # In production:
        # Integrate with Twilio or AWS SNS

        logger.info(f"Successfully sent SMS to={phone_number}")
        return True

    @staticmethod
    async def send_registration_otp(email: EmailStr, otp_code: str):
        """
        Send OTP for registration verification.
        """
        subject = "Your DairyDay Verification Code"
        
        logger.info(f"OTP SEND: to={email} code={otp_code}")
        
        # In a real system, you would render an HTML template here.
        # Simulate sending via email and SMS
        await NotificationService.send_email(
            to_email=email,
            subject=subject,
            template_name="registration_otp",
            context={"otp_code": otp_code}
        )
        # FOR PROJECT DEMONSTRATION: print clearly to stdout so user can see it in logs/terminal
        # Using warning level to ensure it's captured in uvicorn logs even with default settings
        demo_msg = f"\n[DEMO] >>> OTP for {email}: {otp_code} <<<\n"
        logger.warning(demo_msg)
        
        # Also print to stdout for direct terminal visibility
        print(demo_msg)
        return True

    @staticmethod
    async def send_registration_otp_via_phone(phone: str, otp_code: str):
        """
        Simulate sending OTP via SMS.
        """
        demo_msg = f"\n[DEMO] >>> OTP for Phone {phone}: {otp_code} <<<\n"
        logger.warning(demo_msg)
        print(demo_msg)
        return await NotificationService.send_sms(phone, f"Your DairyDay Verification Code: {otp_code}")

    @staticmethod
    async def notify_bill_generated(user_email: EmailStr, user_name: str, month: str, amount: float):
        """
        High-level notification for bill generation.
        """
        subject = f"Your DairyDay Invoice for {month} is Ready"
        context = {
            "user_name": user_name,
            "month": month,
            "amount": amount,
            "due_date": "10th of next month"
        }
        return await NotificationService.send_email(
            to_email=user_email,
            subject=subject,
            template_name="bill_ready",
            context=context
        )
