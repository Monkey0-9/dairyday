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
        attachments: Optional[List[dict]] = None,
    ):
        """
        Send an email notification.
        Uses real SMTP if configured, otherwise falls back to simulation.
        """
        from app.core.config import settings

        if settings.SMTP_HOST and settings.SMTP_USER and \
           settings.SMTP_PASSWORD:
            try:
                msg = EmailMessage()
                msg["Subject"] = subject
                msg["From"] = (
                    f"{settings.EMAILS_FROM_NAME} "
                    f"<{settings.EMAILS_FROM_EMAIL}>"
                )
                msg["To"] = to_email

                # HTML or Plain Text
                msg.set_content(
                    context.get(
                        "body",
                        f"Subject: {subject}\n\n"
                        "This is a notification from DairyDay."
                    )
                )

                if attachments:
                    for att in attachments:
                        msg.add_attachment(
                            att["data"],
                            maintype="application",
                            subtype="pdf",
                            filename=att["filename"],
                        )

                await aiosmtplib.send(
                    msg,
                    hostname=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    username=settings.SMTP_USER,
                    password=settings.SMTP_PASSWORD,
                    use_tls=settings.SMTP_PORT == 465,
                    start_tls=settings.SMTP_PORT == 587,
                    timeout=10.0,
                )
                logger.info(
                    "REAL EMAIL SUCCESS: to=%s subj=%s", to_email, subject
                )
                return True
            except Exception as e:
                logger.error(
                    "REAL EMAIL FAILURE: to=%s error=%s", to_email, str(e)
                )
                # Elite Standard: Fallback to simulation in dev,
                # but log error loudly
                if settings.SENTRY_ENVIRONMENT == "production":
                    raise

        # Simulation Mode
        logger.warning(
            "SIMULATED EMAIL: to=%s subj=%s (SMTP not configured or failed)",
            to_email,
            subject,
        )
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
    async def send_login_otp(email: EmailStr, otp_code: str):
        """
        Send OTP for login verification.
        """
        from app.core.config import settings
        subject = "Your DairyDay Login Code"

        logger.info(f"LOGIN OTP SEND: to={email} code={otp_code}")

        # Try real email
        success = await NotificationService.send_email(
            to_email=email,
            subject=subject,
            template_name="login_otp",
            context={
                "otp_code": otp_code,
                "body": f"Your DairyDay login code is: {otp_code}. "
                        f"It expires in 5 minutes."
            },
        )
        
        # In non-production, we log the OTP for development ease
        if settings.SENTRY_ENVIRONMENT != "production":
            logger.warning(f"DEV-ONLY OTP for {email}: {otp_code}")
            
        return success

    @staticmethod
    async def send_otp_via_phone(phone: str, otp_code: str):
        """
        Simulate sending OTP via SMS.
        """
        demo_msg = f"\n[DEMO] >>> OTP for Phone {phone}: {otp_code} <<<\n"
        logger.warning(demo_msg)
        print(demo_msg)
        return await NotificationService.send_sms(
            phone, f"Your DairyDay Verification Code: {otp_code}"
        )

    @staticmethod
    async def notify_bill_generated(
        user_email: EmailStr, user_name: str, month: str, amount: float
    ):
        """
        High-level notification for bill generation.
        """
        subject = f"Your DairyDay Invoice for {month} is Ready"
        context = {
            "user_name": user_name,
            "month": month,
            "amount": amount,
            "due_date": "10th of next month",
        }
        return await NotificationService.send_email(
            to_email=user_email,
            subject=subject,
            template_name="bill_ready",
            context=context,
        )


# UTR Notification Functions
async def notify_admin_new_utr(
    payment_id,
    customer_name,
    bill_id,
):
    """
    Notify admin of new UTR submission requiring verification.
    """
    try:
        logger.info(
            f"ADMIN NOTIFICATION: New UTR submission from {customer_name} "
            f"(payment_id: {payment_id}, bill_id: {bill_id})"
        )
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")


async def notify_customer_payment_status(
    payment_id,
    approved,
    rejection_reason=None
):
    """
    Notify customer of UTR verification result.
    """
    try:
        if approved:
            logger.info(f"CUSTOMER NOTIFICATION: UTR payment {payment_id} approved")
        else:
            logger.info(
                f"CUSTOMER NOTIFICATION: UTR payment {payment_id} rejected. "
                f"Reason: {rejection_reason}"
            )
    except Exception as e:
        logger.error(f"Failed to send customer notification: {e}")

