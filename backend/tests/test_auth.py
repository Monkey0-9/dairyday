"""
Authentication API tests for DairyOS.
Tests login, refresh token, logout, and password change endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock, patch
import uuid

from app.main import app
from app.db.session import get_db
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.core.security import get_password_hash


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        role="USER",
        price_per_liter=60.0,
        is_active=True,
        hashed_password=get_password_hash("password123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session):
    """Create a test admin user."""
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        name="Test Admin",
        role="ADMIN",
        price_per_liter=60.0,
        is_active=True,
        hashed_password=get_password_hash("adminpass123"),
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


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


class TestLoginEndpoint:
    """Tests for POST /auth/login endpoint."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        """Test successful login returns tokens."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "USER"
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        """Test login fails with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "wrongpassword",
            },
        )
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        """Test login fails for nonexistent user."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "password123",
            },
        )
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client, db_session):
        """Test login fails for inactive user."""
        # Create inactive user
        user = User(
            id=uuid.uuid4(),
            email="inactive@example.com",
            name="Inactive User",
            role="USER",
            price_per_liter=60.0,
            is_active=False,
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(user)
        await db_session.commit()
        
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "inactive@example.com",
                "password": "password123",
            },
        )
        
        assert response.status_code == 401
        assert "Inactive user" in response.json()["detail"]


class TestRefreshTokenEndpoint:
    """Tests for POST /auth/refresh endpoint."""
    
    @pytest.mark.asyncio
    async def test_refresh_success(self, client, test_user):
        """Test successful token refresh."""
        # First get a refresh token
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        refresh_token = login_response.json()["refresh_token"]
        
        # Use refresh token to get new access token
        response = await client.post(
            "/api/v1/auth/refresh",
            params={"refresh_token": refresh_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data  # Token rotation
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_refresh_with_access_token_fails(self, client, test_user):
        """Test that refresh fails with access token instead of refresh token."""
        # Get access token
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        access_token = login_response.json()["access_token"]
        
        # Try to use access token as refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            params={"refresh_token": access_token},
        )
        
        assert response.status_code == 401
        assert "Invalid token type" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client):
        """Test refresh fails with invalid token."""
        response = await client.post(
            "/api/v1/auth/refresh",
            params={"refresh_token": "invalid_token"},
        )
        
        assert response.status_code == 401


class TestLogoutEndpoint:
    """Tests for POST /auth/logout endpoint."""
    
    @pytest.mark.asyncio
    async def test_logout_success(self, client, test_user):
        """Test successful logout clears session."""
        # Login first
        await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        
        # Logout
        response = await client.post("/api/v1/auth/logout")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"


class TestChangePasswordEndpoint:
    """Tests for POST /auth/change-password endpoint."""
    
    @pytest.mark.asyncio
    async def test_change_password_success(self, client, test_user):
        """Test successful password change."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        access_token = login_response.json()["access_token"]
        
        # Change password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "password123",
                "new_password": "newpassword456",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully"
        
        # Verify old password no longer works
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        assert login_response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_change_password_wrong_old_password(self, client, test_user):
        """Test password change fails with wrong old password."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        access_token = login_response.json()["access_token"]
        
        # Try to change with wrong old password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "wrongpassword",
                "new_password": "newpassword456",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        assert response.status_code == 400
        assert "Incorrect old password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_change_password_same_as_old(self, client, test_user):
        """Test password change fails if new password is same as old."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        access_token = login_response.json()["access_token"]
        
        # Try to change to same password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "password123",
                "new_password": "password123",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        assert response.status_code == 400
        assert "different from old password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_change_password_too_short(self, client, test_user):
        """Test password change fails if new password is too short."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "password123",
            },
        )
        access_token = login_response.json()["access_token"]
        
        # Try to change to short password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "password123",
                "new_password": "short",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        assert response.status_code == 400
        assert "at least 8 characters" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_change_password_requires_auth(self, client, test_user):
        """Test password change endpoint requires authentication."""
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "password123",
                "new_password": "newpassword456",
            },
        )
        
        assert response.status_code == 401  # Not authenticated


class TestProtectedEndpoints:
    """Tests for protected endpoints requiring authentication."""
    
    @pytest.mark.asyncio
    async def test_access_protected_without_token(self, client):
        """Test accessing protected endpoint without token fails."""
        response = await client.get("/api/v1/users/")
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_access_protected_with_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token fails."""
        response = await client.get(
            "/api/v1/users/",
            headers={"Authorization": "Bearer invalid_token"},
        )
        
        assert response.status_code == 401

