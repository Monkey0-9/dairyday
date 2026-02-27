import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.password_reset import PasswordResetRequest, RequestStatus


@pytest.mark.asyncio
async def test_admin_approved_password_reset_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_admin: User,
    admin_token: str
):
    """
    Test the full flow of password reset with admin approval:
    1. User requests reset.
    2. Request appears in admin list.
    3. Admin approves request.
    4. User completes reset with new password.
    5. User logs in with new password.
    """
    # 1. User initiates forgot-password
    forgot_resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": test_user.email}
    )
    assert forgot_resp.status_code == 200
    assert "reviewed by an administrator" in forgot_resp.json()["message"]

    # 2. Verify request exists in DB
    from sqlalchemy import select
    res = await db_session.execute(
        select(PasswordResetRequest)
        .where(PasswordResetRequest.user_id == test_user.id)
        .order_by(PasswordResetRequest.created_at.desc())
    )
    reset_req = res.scalars().first()
    
    assert reset_req is not None
    assert reset_req.status == RequestStatus.PENDING
    request_id = str(reset_req.id)

    # 3. Admin views requests
    headers = {"Authorization": f"Bearer {admin_token}"}
    list_resp = await client.get(
        "/api/v1/admin/auth/password-requests",
        headers=headers
    )
    assert list_resp.status_code == 200
    requests = list_resp.json()
    assert any(r["id"] == request_id for r in requests)

    # 4. Admin approves request
    approve_resp = await client.post(
        f"/api/v1/admin/auth/password-requests/{request_id}/approve",
        headers=headers
    )
    assert approve_resp.status_code == 200
    assert "approved" in approve_resp.json()["message"].lower()

    # 5. Verify status is APPROVED
    await db_session.refresh(reset_req)
    assert reset_req.status == RequestStatus.APPROVED
    assert reset_req.admin_id == test_admin.id

    # 6. User checks status and gets JWT
    status_resp = await client.get(
        "/api/v1/auth/check-reset-status",
        params={"identifier": test_user.email}
    )
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == RequestStatus.APPROVED
    assert "token" in status_data
    reset_token = status_data["token"]
    assert reset_token is not None

    # 7. User completes password reset with JWT
    new_pass = "ComplexPass456!"
    reset_final_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "identifier": test_user.email,
            "new_password": new_pass,
            "token": reset_token
        }
    )
    assert reset_final_resp.status_code == 200
    assert "successfully" in reset_final_resp.json()["message"].lower()

    # 8. Verify status is COMPLETED
    await db_session.refresh(reset_req)
    assert reset_req.status == RequestStatus.COMPLETED

    # 9. Verify login with new password
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": new_pass
        }
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
