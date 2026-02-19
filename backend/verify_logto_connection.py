
import asyncio
import httpx
from app.core.security import verify_logto_token
from app.core.config import settings

async def verify_real_logto_endpoint():
    print(f"Testing connection to Logto JWKS: {settings.LOGTO_JWKS_URI}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(settings.LOGTO_JWKS_URI)
            print(f"JWKS Response Status: {response.status_code}")
            if response.status_code == 200:
                print("Successfully fetched JWKS from Logto.")
            else:
                print(f"Failed to fetch JWKS: {response.text}")
        except Exception as e:
            print(f"Error connecting to Logto: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify_real_logto_endpoint())
