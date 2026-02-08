import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
import hmac, hashlib, json, uuid
import datetime

@pytest.mark.asyncio
async def test_webhook_marks_bill_paid():
    # Ensure secret for signature
    settings.RAZORPAY_KEY_SECRET = "testsecret"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Admin login
        res = await ac.post("/api/v1/auth/login", data={"username":"admin@dairy.com","password":"admin123"})
        assert res.status_code == 200
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # Create user and bill
        email = f"payuser_{uuid.uuid4()}@dairy.com"
        res = await ac.post("/api/v1/users/", json={"email":email,"password":"password123","name":"Pay User","phone":"2222222222","price_per_liter":30.0,"is_active":True}, headers=headers)
        user_id = res.json()["id"]
        today = datetime.date.today()
        month = today.strftime("%Y-%m")
        # Ensure consumption so bill exists
        await ac.patch("/api/v1/consumption/", json={"user_id":user_id,"date":today.isoformat(),"quantity":1.0}, headers=headers)
        await ac.post(f"/api/v1/bills/generate-all?month={month}", headers=headers)
        # Build webhook body
        payment_id = f"pay_{uuid.uuid4()}"
        body = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "notes": {"bill_id": str(uuid.UUID(user_id))} if isinstance(user_id, str) else {"bill_id": None}
                    }
                }
            }
        }
        # The above notes expects bill_id; we need actual bill id, fetch bill
        res = await ac.get(f"/api/v1/bills/{user_id}/{month}", headers=headers)
        assert res.status_code == 200
        bill = res.json()
        body["payload"]["payment"]["entity"]["notes"]["bill_id"] = bill["id"]
        body_bytes = json.dumps(body).encode()
        sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), body_bytes, hashlib.sha256).hexdigest()
        res = await ac.post("/api/v1/payments/webhook", content=body_bytes, headers={"X-Razorpay-Signature":sig, "Content-Type":"application/json"})
        assert res.status_code == 200
        # Verify bill is PAID
        res = await ac.get(f"/api/v1/bills/{user_id}/{month}", headers=headers)
        assert res.status_code == 200
        bill = res.json()
        assert bill["status"] == "PAID"
