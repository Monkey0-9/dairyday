"""
Billing service tests for DairyOS.
Tests bill calculation and generation logic.
"""

import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date
from uuid import uuid4

from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill


def test_calculate_month_range():
    """Test month range calculation for January 2026."""
    from app.services.billing import calculate_month_range
    
    start, end = calculate_month_range("2026-01")
    assert start == date(2026, 1, 1)
    assert end == date(2026, 1, 31)
    
    # February (non-leap year)
    start, end = calculate_month_range("2026-02")
    assert start == date(2026, 2, 1)
    assert end == date(2026, 2, 28)
    
    # February (leap year)
    start, end = calculate_month_range("2024-02")
    assert start == date(2024, 2, 1)
    assert end == date(2024, 2, 29)


def test_billing_calculation():
    """Test bill calculation accuracy."""
    from app.services.billing import calculate_bill_amount
    
    # Test with user having price_per_liter = 50
    price_per_liter = Decimal("50.00")
    total_liters = Decimal("10.5")
    
    amount = calculate_bill_amount(total_liters, price_per_liter)
    expected = Decimal("525.00")  # 10.5 * 50
    
    assert amount == expected


@pytest.mark.asyncio
async def test_bill_total_calculation(db_session):
    """Test that bill total equals liters * price."""
    from app.services.billing import generate_bill_for_user
    
    # Create test user
    user = User(
        id=uuid4(),
        email="test_bill_total@example.com",
        name="Test Bill Total User",
        role="USER",
        price_per_liter=Decimal("60.00"),
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()
    
    # Add consumption: 10L for the user
    for i in range(10):
        consumption = Consumption(
            id=uuid4(),
            user_id=user.id,
            date=date.today().replace(day=i+1),
            quantity=Decimal("1.0")
        )
        db_session.add(consumption)
    await db_session.commit()
    
    # Generate bill
    bill = await generate_bill_for_user(db_session, user.id, "2026-01", enqueue_pdf=False)
    
    assert bill is not None
    assert bill.total_liters == Decimal("10.0")
    assert bill.total_amount == Decimal("600.00")  # 10 * 60


@pytest.mark.asyncio
async def test_bill_regeneration_no_duplicates(db_session):
    """Test that regenerating a bill doesn't create duplicates."""
    from app.services.billing import generate_bill_for_user
    from sqlalchemy import select, func
    
    # Create test user
    user = User(
        id=uuid4(),
        email="test_regeneration@example.com",
        name="Test Regeneration User",
        role="USER",
        price_per_liter=Decimal("50.00"),
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()
    
    # Generate bill first time
    bill1 = await generate_bill_for_user(db_session, user.id, "2026-02", enqueue_pdf=False)
    
    # Generate bill again (should update, not create new)
    bill2 = await generate_bill_for_user(db_session, user.id, "2026-02", enqueue_pdf=False)
    
    # Check only one bill exists
    result = await db_session.execute(
        select(func.count(Bill.id)).where(
            Bill.user_id == user.id,
            Bill.month == "2026-02"
        )
    )
    count = result.scalar()
    
    assert count == 1
    assert bill1.id == bill2.id  # Same bill updated

