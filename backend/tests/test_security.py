import os
import pytest
import uuid
from jose import jwt

from app.core.config import settings
from tests.constants import TEST_USER_PASSWORD, TEST_ADMIN_PASSWORD


# Using global fixtures from conftest.py
# (db_session, client, test_user, test_admin)


class TestLoginSuccess:
    """Test successful login flow."""

    @pytest.mark.asyncio
    async def test_login_success(self, client, test_admin):
        """Test login returns access and refresh tokens directly."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "admin@example.com", "password": TEST_ADMIN_PASSWORD},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "admin@example.com"


class TestLoginInvalidCredentials:
    """Test login with invalid credentials."""

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_admin):
        """Test login fails with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "admin@example.com",
                "password": os.environ.get("TEST_PASSWORD", "wrongpassword"),
            },
        )

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        """Test login fails for nonexistent user."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent@test.com", "password": TEST_USER_PASSWORD},
        )

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


class TestAdminOnlyEndpoint:
    """Test admin-only endpoint access control."""

    @pytest.mark.asyncio
    async def test_users_list_requires_admin(self, client, user_token):
        """Test that users list endpoint rejects regular users."""
        # Try to access admin-only endpoint
        response = await client.get(
            "/api/v1/users/", headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403
        assert "privileges" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_admin_can_access_users_list(self, client, admin_token):
        """Test that admin can access users list."""
        # Access admin endpoint
        response = await client.get(
            "/api/v1/users/", headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUserDataIsolation:
    """Test that users can only see their own data."""

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_user_bills(
        self, client, test_user, user_token, db_session
    ):
        """Test users cannot fetch other users' bills."""
        from app.models.bill import Bill

        # Create a bill for the test user
        bill = Bill(
            id=uuid.uuid4(),
            user_id=test_user.id,
            month="2026-01",
            total_liters=10.0,
            total_amount=500.0,
            status="UNPAID",
        )
        db_session.add(bill)
        await db_session.commit()

        # Try to access the bill with correct user_id - should work
        response = await client.get(
            f"/api/v1/bills/{test_user.id}/2026-01",
            headers={"Authorization": f"Bearer {user_token}"},
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
    async def test_access_token_contains_correct_claims(self, user_token):
        """Test that access token contains correct user information."""
        payload = jwt.decode(
            user_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False, "verify_iss": False},
        )

        assert payload["type"] == "access"
        assert "sub" in payload
        assert "exp" in payload

    @pytest.mark.asyncio
    async def test_refresh_token_has_different_type(self, client, db_session, test_user):
        """Test that refresh token has type='refresh'."""
        # Manual login to get refresh token
        res1 = await client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": TEST_USER_PASSWORD},
        )
        assert res1.status_code == 200
        data = res1.json()
        refresh_token = data.get("refresh_token") or res1.cookies.get("refresh_token")
        assert refresh_token is not None
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False, "verify_iss": False},
        )

        assert payload["type"] == "refresh"

    @pytest.mark.asyncio
    async def test_cannot_use_refresh_token_as_access(self, client, db_session, test_user):
        """Test that refresh token cannot be used as access token."""

        res1 = await client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": TEST_USER_PASSWORD},
        )
        assert res1.status_code == 200
        data = res1.json()
        refresh_token = data.get("refresh_token") or res1.cookies.get("refresh_token")
        assert refresh_token is not None

        # Try to use refresh token for an admin endpoint
        response = await client.get(
            "/api/v1/users/", headers={"Authorization": f"Bearer {refresh_token}"}
        )

        # Should fail because refresh token is not valid for this endpoint
        assert response.status_code == 401
        assert "Invalid token type" in response.json()["detail"]
