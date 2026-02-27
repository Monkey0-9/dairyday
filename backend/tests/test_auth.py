import os
import pytest
import uuid

from app.models.user import User  # type: ignore
from app.core.security import get_password_hash  # type: ignore
from tests.constants import TEST_USER_PASSWORD 


# Using global fixtures from conftest.py
# (db_session, client, test_user, test_admin)


class TestLoginEndpoint:
    """Tests for POST /auth/login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        """Test successful login returns access and refresh tokens."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": TEST_USER_PASSWORD,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == test_user.email
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        """Test login fails with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
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
            data={
                "username": "nonexistent@example.com",
                "password": TEST_USER_PASSWORD,
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
            hashed_password=get_password_hash(TEST_USER_PASSWORD),
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "inactive@example.com",
                "password": TEST_USER_PASSWORD,
            },
        )

        assert response.status_code == 401
        assert "Inactive user" in response.json()["detail"]


class TestRefreshTokenEndpoint:
    """Tests for POST /auth/refresh endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_success(self, client, user_token, db_session):
        """Test successful token refresh."""
        # Manual login to get a fresh refresh token
        res1 = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": TEST_USER_PASSWORD
            }
        )
        refresh_token = res1.json()["refresh_token"]

        # Use refresh token to get new access token
        response = await client.post(
            "/api/v1/auth/refresh",
            params={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_fails(self, client, user_token):
        """Test that refresh fails with access token instead of refresh token."""
        # Clear cookies to ensure we only use the token from params/body
        client.cookies.clear()

        # Try to use access token as refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            params={"refresh_token": user_token}
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
    async def test_logout_success(self, client, user_token):
        """Test successful logout clears session."""
        # Use the token from the fixture
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.post("/api/v1/auth/logout", headers=headers)

        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"


class TestChangePasswordEndpoint:
    """Tests for POST /auth/change-password endpoint."""

    @pytest.mark.asyncio
    async def test_change_password_success(self, client, test_user, user_token):
        """Test successful password change."""
        # Use token from fixture
        headers = {"Authorization": f"Bearer {user_token}"}

        # Change password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": TEST_USER_PASSWORD,
                "new_password": "NewPassword456",
            },
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully"

        # Verify old password no longer works
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": TEST_USER_PASSWORD,
            },
        )
        assert login_response.status_code == 401

    @pytest.mark.asyncio
    async def test_change_password_wrong_old_password(self, client, user_token):
        """Test password change fails with wrong old password."""
        headers = {"Authorization": f"Bearer {user_token}"}
        # Try to change with wrong old password
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": "WrongPassword123",
                "new_password": "NewPassword456",
            },
            headers=headers,
        )
        assert response.status_code == 400
        assert "Incorrect old password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_change_password_same_as_old(self, client, user_token):
        """Test password change fails if new password is same as old."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": TEST_USER_PASSWORD,
                "new_password": TEST_USER_PASSWORD,
            },
            headers=headers,
        )

        assert response.status_code == 400
        assert "different from old password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_change_password_too_short(self, client, user_token):
        """Test password change fails if new password is too short."""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": TEST_USER_PASSWORD,
                "new_password": "NewPW",
            },
            headers=headers,
        )

        # Pydantic validation triggers 422 for min_length
        assert response.status_code == 422
        assert "at least 8 characters" in str(response.json()["detail"])

    @pytest.mark.asyncio
    async def test_change_password_requires_auth(self, client, test_user):
        """Test password change endpoint requires authentication."""
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "old_password": TEST_USER_PASSWORD,
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
