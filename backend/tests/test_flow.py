"""
Full flow integration tests for DairyOS.
Tests the complete flow: login → consumption → billing → payment
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from decimal import Decimal
import uuid

from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_full_flow(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test complete flow: login → consumption → billing → payment"""
    
    # 1. Create test users first
    admin = User(
        id=uuid.uuid4(),
        email="flow_test_admin@dairy.com",
        name="Flow Test Admin",
        role="ADMIN",
        price_per_liter=Decimal("60.00"),
        is_active=True,
        hashed_password=get_password_hash("admin123"),
    )
    db_session.add(admin)
    
    regular_user = User(
        id=uuid.uuid4(),
        email="flow_test_user@dairy.com",
        name="Flow Test User",
        role="USER",
        price_per_liter=Decimal("60.00"),
        is_active=True,
        hashed_password=get_password_hash("user123"),
    )
    db_session.add(regular_user)
    await db_session.commit()
    
    # 2. Admin Login
    login_data = {
        "username": "flow_test_admin@dairy.com",
        "password": "admin123"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    tokens = response.json()
    admin_token = tokens["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 3. User Login
    user_login_data = {
        "username": "flow_test_user@dairy.com",
        "password": "user123"
    }
    response = await client.post("/api/v1/auth/login", data=user_login_data)
    assert response.status_code == 200, f"User login failed: {response.text}"
    user_tokens = response.json()
    user_token = user_tokens["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    # 4. Admin adds consumption for user
    yesterday = date.today() - timedelta(days=1)
    consumption_data = {
        "user_id": str(regular_user.id),
        "date": yesterday.isoformat(),
        "quantity": 10.5
    }
    response = await client.patch(
        "/api/v1/consumption/",
        json=consumption_data,
        headers=admin_headers
    )
    assert response.status_code == 200, f"Add consumption failed: {response.text}"
    
    # 5. Admin generates bill for the month
    month_str = yesterday.strftime("%Y-%m")
    response = await client.post(
        f"/api/v1/bills/generate/{regular_user.id}/{month_str}",
        headers=admin_headers
    )
    assert response.status_code == 200, f"Generate bill failed: {response.text}"
    bill_data = response.json()
    
    # Verify bill calculation: 10.5 liters * ₹60/liter = ₹630
    assert float(bill_data["total_liters"]) == 10.5
    assert float(bill_data["total_amount"]) == 630.0
    assert bill_data["status"] == "UNPAID"
    
    # 6. User can view own bill
    response = await client.get(
        f"/api/v1/bills/{regular_user.id}/{month_str}",
        headers=user_headers
    )
    assert response.status_code == 200, f"Get bill failed: {response.text}"
    
    # 7. User cannot view other user's bill (admin's bill)
    # Create a bill for admin first
    admin_consumption = Consumption(
        id=uuid.uuid4(),
        user_id=admin.id,
        date=yesterday,
        quantity=Decimal("5.0")
    )
    db_session.add(admin_consumption)
    await db_session.commit()
    
    response = await client.post(
        f"/api/v1/bills/generate/{admin.id}/{month_str}",
        headers=admin_headers
    )
    
    # User tries to access admin's bill - should be forbidden
    response = await client.get(
        f"/api/v1/bills/{admin.id}/{month_str}",
        headers=user_headers
    )
    assert response.status_code == 403, f"Should have forbidden access to admin's bill: {response.text}"
    
    # 8. User can view own consumption history
    response = await client.get(
        f"/api/v1/consumption/mine?month={month_str}",
        headers=user_headers
    )
    assert response.status_code == 200
    consumption_history = response.json()
    assert len(consumption_history) >= 1
    
    # 9. Admin can list all users
    response = await client.get("/api/v1/users/", headers=admin_headers)
    assert response.status_code == 200
    users_list = response.json()
    assert len(users_list) >= 2  # At least our test users
    
    # 10. Regular user cannot access admin endpoints
    response = await client.get("/api/v1/users/", headers=user_headers)
    assert response.status_code == 403, f"Regular user should not access admin endpoints: {response.text}"
    
    # 11. Refresh token works
    response = await client.post(
        "/api/v1/auth/refresh",
        params={"refresh_token": user_tokens["refresh_token"]}
    )
    assert response.status_code == 200
    new_tokens = response.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    
    # 12. Logout works
    response = await client.post("/api/v1/auth/logout", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"
    
    print("✅ Full flow test passed!")


@pytest.mark.asyncio
async def test_lock_rule_enforcement(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test that 7-day lock rule is enforced correctly."""
    
    # Create test users
    admin = User(
        id=uuid.uuid4(),
        email="lock_test_admin@dairy.com",
        name="Lock Test Admin",
        role="ADMIN",
        price_per_liter=Decimal("50.00"),
        is_active=True,
        hashed_password=get_password_hash("admin123"),
    )
    db_session.add(admin)
    
    regular_user = User(
        id=uuid.uuid4(),
        email="lock_test_user@dairy.com",
        name="Lock Test User",
        role="USER",
        price_per_liter=Decimal("50.00"),
        is_active=True,
        hashed_password=get_password_hash("user123"),
    )
    db_session.add(regular_user)
    await db_session.commit()
    
    # Login as admin
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "lock_test_admin@dairy.com", "password": "admin123"}
    )
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Try to add consumption older than 7 days - should fail
    old_date = date.today() - timedelta(days=10)
    consumption_data = {
        "user_id": str(regular_user.id),
        "date": old_date.isoformat(),
        "quantity": 5.0
    }
    response = await client.patch(
        "/api/v1/consumption/",
        json=consumption_data,
        headers=headers
    )
    assert response.status_code == 403, f"Should reject old consumption: {response.text}"
    assert "locked" in response.json()["detail"].lower() or "older" in response.json()["detail"].lower()
    
    # Add consumption for today - should succeed
    today = date.today()
    consumption_data["date"] = today.isoformat()
    response = await client.patch(
        "/api/v1/consumption/",
        json=consumption_data,
        headers=headers
    )
    assert response.status_code == 200, f"Should accept today's consumption: {response.text}"
    
    print("✅ Lock rule enforcement test passed!")


@pytest.mark.asyncio
async def test_user_data_isolation(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test that users can only access their own data."""
    
    # Create two users
    user1 = User(
        id=uuid.uuid4(),
        email="user1_isolation@dairy.com",
        name="User One",
        role="USER",
        price_per_liter=Decimal("55.00"),
        is_active=True,
        hashed_password=get_password_hash("user123"),
    )
    db_session.add(user1)
    
    user2 = User(
        id=uuid.uuid4(),
        email="user2_isolation@dairy.com",
        name="User Two",
        role="USER",
        price_per_liter=Decimal("55.00"),
        is_active=True,
        hashed_password=get_password_hash("user123"),
    )
    db_session.add(user2)
    await db_session.commit()
    
    # Login as user1
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "user1_isolation@dairy.com", "password": "user123"}
    )
    user1_token = response.json()["access_token"]
    user1_headers = {"Authorization": f"Bearer {user1_token}"}
    
    # Login as user2
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "user2_isolation@dairy.com", "password": "user123"}
    )
    user2_token = response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    current_month = date.today().strftime("%Y-%m")
    
    # User1 cannot access User2's bills
    response = await client.get(
        f"/api/v1/bills/{user2.id}/{current_month}",
        headers=user1_headers
    )
    assert response.status_code == 403
    
    # User2 cannot access User1's bills
    response = await client.get(
        f"/api/v1/bills/{user1.id}/{current_month}",
        headers=user2_headers
    )
    assert response.status_code == 403
    
    print("✅ User data isolation test passed!")

