import asyncio
from app.db.session import async_session
from app.services.billing_service import BillingService

async def main():
    async with async_session() as db:
        service = BillingService(db)
        print("Starting generate_batch_bills...")
        try:
            bills = await service.generate_batch_bills("2026-03")
            print(f"Generated {len(bills)} bills:")
            for b in bills:
                print(f"Bill: {b.id}, user: {b.user_id}, total_liters: {b.total_liters}, amount: {b.total_amount}")
        except Exception as e:
            print("ERROR", e)

if __name__ == "__main__":
    asyncio.run(main())
