import hmac
import hashlib
import json
import uuid
import datetime
import pytest
from app.core.config import settings

@pytest.mark.asyncio
async def test_webhook_marks_bill_paid(client, auth_headers):
    # Ensure secret for signature
    settings.RAZORPAY_WEBHOOK_SECRET = "testsecret"
    
    # Create user and bill
    email = f"payuser_{uuid.uuid4()}@dairy.com"
    res = await client.post(
        "/api/v1/users/", 
        json={
            "email": email,
            "password": "Password123",
            "name": "Pay User",
            "phone": "2222222222",
            "price_per_liter": 30.0,
            "is_active": True
        }, 
        headers=auth_headers
    )
    assert res.status_code == 201, f"User creation failed: {res.text}"
    user_id = res.json()["id"]
    today = datetime.date.today()
    month = today.strftime("%Y-%m")
    
    # Ensure consumption so bill exists
    await client.patch(
        "/api/v1/consumption/", 
        json={"user_id": user_id, "date": today.isoformat(), "quantity": 1.0}, 
        headers=auth_headers
    )
    await client.post(f"/api/v1/bills/generate-all?month={month}", headers=auth_headers)
    
    # Build webhook body
    payment_id = f"pay_{uuid.uuid4()}"
    body = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "notes": {"bill_id": None}
                }
            }
        }
    }
    
    # fetch bill
    res = await client.get(f"/api/v1/bills/{user_id}/{month}", headers=auth_headers)
    assert res.status_code == 200
    bill = res.json()
    body["payload"]["payment"]["entity"]["notes"]["bill_id"] = bill["id"]
    
    body_bytes = json.dumps(body).encode()
    sig = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body_bytes, hashlib.sha256).hexdigest()
    
    res = await client.post(
        "/api/v1/payments/webhook", 
        content=body_bytes, 
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    )
    assert res.status_code == 200, f"Webhook failed: {res.text}"
    
    # Verify bill is PAID
    res = await client.get(f"/api/v1/bills/{user_id}/{month}", headers=auth_headers)
    assert res.status_code == 200
    bill = res.json()
    assert bill["status"] == "PAID"
