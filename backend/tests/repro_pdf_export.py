import sys
import os
import uuid
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.getcwd())

from app.main import app
from app.api import deps
from app.models.user import User

# Patch Global Error Handler to let exceptions bubble up
from app.middleware.error_handler import GlobalErrorHandlerMiddleware

async def mock_dispatch(self, request, call_next):
    return await call_next(request)

GlobalErrorHandlerMiddleware.dispatch = mock_dispatch

# Mock User
mock_admin = User(
    id=uuid.uuid4(),
    email="admin@example.com",
    name="Admin User",
    role="ADMIN",
    is_active=True
)

def override_get_current_active_admin():
    return mock_admin

def override_get_current_user():
    return mock_admin

app.dependency_overrides[deps.get_current_active_admin] = override_get_current_active_admin
app.dependency_overrides[deps.get_current_user] = override_get_current_user

client = TestClient(app, raise_server_exceptions=True)

def test_export_pdf():
    print("Testing PDF export for 2026-02...")
    try:
        response = client.get("/api/v1/consumption/export-pdf?month=2026-02")
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
        else:
            print("Success!")
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Content Length: {len(response.content)}")
            
            # Save to file
            with open("debug_report.pdf", "wb") as f:
                f.write(response.content)
            print("Saved to debug_report.pdf")
            
    except Exception as e:
        print(f"Crashed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_export_pdf()
