import asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.main import app

async def run_real_debug():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        print("\n--- Real Login Attempt (Admin) ---")
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "admin@dairy.com", "password": "admin123"}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 500:
            import json
            try:
                print("DEBUG BODY BELOW:")
                print(json.dumps(response.json(), indent=2))
            except:
                print(f"RAW BODY: {response.text}")
        else:
            print(f"Body: {response.text[:200]}")

if __name__ == "__main__":
    # Ensure we are in development mode to avoid redis issues if possible
    os.environ["ENVIRONMENT"] = "development"
    asyncio.run(run_real_real_debug() if "run_real_real_debug" in globals() else run_real_debug())
