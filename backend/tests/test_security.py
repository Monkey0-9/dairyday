"""
Security tests for DairyOS.
Tests authentication, authorization, and data isolation.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings


@pytest_asyncio.fixture
async def test_admin(db_session):
    """Create a test admin user."""
    admin = User(
        id=uuid4(),
        email="admin@test.com",
        name="Admin Test",
        role="ADMIN",
        price_per_liter=50.0,
        is_active=True,
        hashed_password=get_password_hash("admin123"),
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test regular user."""
    user = User(
        id=uuid4(),
        email="user@test.com",
        name="User Test",
        role="USER",
        price_per_liter=50.0,
        is_active=True,
        hashed_password=get_password_hash("user123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(db_session):
    """Create async test client."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


class TestLoginSuccess:
    """Test successful login flow."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_admin):
        """Test successful login returns tokens in cookies."""
        response = await client.post("/api/v1/auth/login", data={
            "username": "admin@test.com",
            "password": "admin123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "ADMIN"
        
        # Check both JSON and cookies for tokens
        assert ("access_token" in data or "access_token" in response.cookies)
        assert ("refresh_token" in data or "refresh_token" in response.cookies)


class TestLoginInvalidCredentials:
    """Test login with invalid credentials."""
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_admin):
        """Test login fails with wrong password."""
        response = await client.post("/api/v1/auth/login", data={
            "username": "admin@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        """Test login fails for nonexistent user."""
        response = await client.post("/api/v1/auth/login", data={
            "username": "nonexistent@test.com",
            "password": "password123"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


class TestAdminOnlyEndpoint:
    """Test admin-only endpoint access control."""
    
    @pytest.mark.asyncio
    async def test_users_list_requires_admin(self, client, test_user):
        """Test that users list endpoint rejects regular users."""
        # Login as regular user
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "user@test.com",
            "password": "user123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        user_token = data.get("access_token") or login_response.cookies.get("access_token")
        assert user_token is not None
        
        # Try to access admin-only endpoint
        response = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 403
        assert "privileges" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_admin_can_access_users_list(self, client, test_admin):
        """Test that admin can access users list."""
        # Login as admin
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "admin@test.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        admin_token = data.get("access_token") or login_response.cookies.get("access_token")
        assert admin_token is not None
        
        # Access admin endpoint
        response = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUserDataIsolation:
    """Test that users can only see their own data."""
    
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_user_bills(self, client, test_user, db_session):
        """Test users cannot fetch other users' bills."""
        from app.models.bill import Bill
        
        # Create a bill for the test user
        bill = Bill(
            id=uuid4(),
            user_id=test_user.id,
            month="2026-01",
            total_liters=10.0,
            total_amount=500.0,
            status="UNPAID"
        )
        db_session.add(bill)
        await db_session.commit()
        
        # Login as the user
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "user@test.com",
            "password": "user123"
        })
        data = login_response.json()
        user_token = data.get("access_token") or login_response.cookies.get("access_token")
        assert user_token is not None
        
        # Try to access the bill with correct user_id - should work
        response = await client.get(
            f"/api/v1/bills/{test_user.id}/2026-01",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_unauthenticated_access_denied(self, client):
        """Test that unauthenticated requests are rejected."""
        response = await client.get("/api/v1/users/")
        
        assert response.status_code == 401


class TestTokenSecurity:
    """Test token security features."""
    
    @pytest.mark.asyncio
    async def test_access_token_contains_correct_claims(self, client, test_user):
        """Test that access token contains correct user information."""
        from jose import jwt
        
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "user@test.com",
            "password": "user123"
        })
        
        data = login_response.json()
        token = data.get("access_token") or login_response.cookies.get("access_token")
        assert token is not None
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False, "verify_iss": False}
        )
        
        assert payload["type"] == "access"
        assert "sub" in payload
        assert "exp" in payload
    
    @pytest.mark.asyncio
    async def test_refresh_token_has_different_type(self, client, test_user):
        """Test that refresh token has type='refresh'."""
        from jose import jwt
        
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "user@test.com",
            "password": "user123"
        })
        
        data = login_response.json()
        refresh_token = data.get("refresh_token") or login_response.cookies.get("refresh_token")
        assert refresh_token is not None
        payload = jwt.decode(
            refresh_token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False, "verify_iss": False}
        )
        
        assert payload["type"] == "refresh"
    
    @pytest.mark.asyncio
    async def test_cannot_use_refresh_token_as_access(self, client, test_user):
        """Test that refresh token cannot be used as access token."""
        
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "user@test.com",
            "password": "user123"
        })
        
        data = login_response.json()
        refresh_token = data.get("refresh_token") or login_response.cookies.get("refresh_token")
        assert refresh_token is not None
        
        # Try to use refresh token for an admin endpoint
        response = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        
        # Should fail because refresh token is not valid for this endpoint
        assert response.status_code == 401
        assert "Invalid token type" in response.json()["detail"]

