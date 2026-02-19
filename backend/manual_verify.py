
import httpx
import asyncio

async def verify():
    url = "http://localhost:8000/api/v1/registration/verify-otp"
    data = {
        "email": "verify_c65acd17@example.com",
        "otp_code": "720867"
    }
    print(f"Posting to {url} with {data}...")
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=data)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")

if __name__ == "__main__":
    asyncio.run(verify())
