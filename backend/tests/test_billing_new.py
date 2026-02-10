"""
Billing service tests for DairyOS.
Tests bill calculation, generation, and edge cases.
"""

import pytest
from decimal import Decimal
from datetime import date
from uuid import uuid4
from unittest.mock import patch, MagicMock

from app.services.billing import (
    calculate_month_range,
    calculate_bill_amount,
    generate_bill_for_user,
    format_currency,
)


class TestCalculateMonthRange:
    """Tests for calculate_month_range function."""
    
    def test_valid_months(self):
        """Test valid month parsing."""
        # January
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
        
        # December
        start, end = calculate_month_range("2026-12")
        assert start == date(2026, 12, 1)
        assert end == date(2026, 12, 31)
    
    def test_invalid_month_format(self):
        """Test that invalid month format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid month format"):
            calculate_month_range("2026/01")
        
        with pytest.raises(ValueError, match="Invalid month format"):
            calculate_month_range("jan-2026")
        
        with pytest.raises(ValueError, match="Invalid month format"):
            calculate_month_range("202601")
    
    def test_invalid_month_number(self):
        """Test that invalid month numbers raise ValueError."""
        with pytest.raises(ValueError):
            calculate_month_range("2026-00")
        
        with pytest.raises(ValueError):
            calculate_month_range("2026-13")


class TestCalculateBillAmount:
    """Tests for calculate_bill_amount function."""
    
    def test_basic_calculation(self):
        """Test basic bill calculation."""
        price_per_liter = Decimal("50.00")
        total_liters = Decimal("10.5")
        
        amount = calculate_bill_amount(total_liters, price_per_liter)
        expected = Decimal("525.00")  # 10.5 * 50
        assert amount == expected
    
    def test_rounding_behavior(self):
        """Test that amount is rounded to 2 decimal places."""
        # 0.1 * 0.3 = 0.03 - exact
        assert calculate_bill_amount(Decimal("0.1"), Decimal("0.3")) == Decimal("0.03")
        
        # 0.1 * 0.35 = 0.035 - should round to 0.04 (banker's rounding)
        assert calculate_bill_amount(Decimal("0.1"), Decimal("0.35")) == Decimal("0.04")
        
        # 0.1 * 0.25 = 0.025 - should round to 0.02 (banker's rounding)
        assert calculate_bill_amount(Decimal("0.1"), Decimal("0.25")) == Decimal("0.02")
    
    def test_zero_liters(self):
        """Test with zero consumption."""
        amount = calculate_bill_amount(Decimal("0"), Decimal("50.00"))
        assert amount == Decimal("0.00")
    
    def test_zero_price(self):
        """Test with zero price per liter."""
        amount = calculate_bill_amount(Decimal("100"), Decimal("0"))
        assert amount == Decimal("0.00")
    
    def test_large_amount(self):
        """Test with large amounts."""
        total_liters = Decimal("9999.999")
        price = Decimal("999.999")
        
        amount = calculate_bill_amount(total_liters, price)
        assert amount == amount.quantize(Decimal("0.01"))  # Rounded to 2 decimals


class TestFormatCurrency:
    """Tests for format_currency function."""
    
    def test_basic_formatting(self):
        """Test basic currency formatting."""
        assert format_currency(Decimal("100")) == "₹100.00"
        assert format_currency(Decimal("1234.56")) == "₹1,234.56"
    
    def test_indian_numbering(self):
        """Test Indian numbering system (lakhs/crores)."""
        # 1 lakh
        assert format_currency(Decimal("100000")) == "₹1,00,000.00"
        
        # 10 lakhs
        assert format_currency(Decimal("1000000")) == "₹10,00,000.00"
        
        # 1 crore
        assert format_currency(Decimal("10000000")) == "₹1,00,00,000.00"
    
    def test_small_amounts(self):
        """Test formatting of small amounts."""
        assert format_currency(Decimal("0.50")) == "₹0.50"
        assert format_currency(Decimal("0.01")) == "₹0.01"


class TestGenerateBillForUser:
    """Tests for generate_bill_for_user function."""
    
    @pytest.mark.asyncio
    async def test_bill_generation_with_consumption(self, db_session):
        """Test bill generation with consumption data."""
        from app.models.user import User
        from app.models.consumption import Consumption
        
        # Create test user
        user = User(
            id=uuid4(),
            email="test_billing@example.com",
            name="Test Billing User",
            role="USER",
            price_per_liter=Decimal("60.00"),
            is_active=True
        )
        db_session.add(user)
        await db_session.flush()
        
        # Add consumption for January 2026
        for day in range(1, 11):  # First 10 days
            consumption = Consumption(
                id=uuid4(),
                user_id=user.id,
                date=date(2026, 1, day),
                quantity=Decimal("2.0")
            )
            db_session.add(consumption)
        await db_session.commit()
        
        # Generate bill
        with patch('app.workers.tasks.generate_and_upload_pdf') as mock_task:
            mock_task.delay = MagicMock()
            
            bill = await generate_bill_for_user(
                db_session, 
                user.id, 
                "2026-01",
                enqueue_pdf=False
            )
        
        # Verify bill
        assert bill is not None
        assert bill.total_liters == Decimal("20.0")  # 10 days * 2L
        assert bill.total_amount == Decimal("1200.00")  # 20L * 60
        assert bill.status == "UNPAID"
        assert bill.month == "2026-01"
    
    @pytest.mark.asyncio
    async def test_bill_generation_no_consumption(self, db_session):
        """Test bill generation with no consumption."""
        from app.models.user import User
        
        user = User(
            id=uuid4(),
            email="test_no_consumption@example.com",
            name="Test No Consumption",
            role="USER",
            price_per_liter=Decimal("50.00"),
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()
        
        bill = await generate_bill_for_user(
            db_session, 
            user.id, 
            "2026-01",
            enqueue_pdf=False
        )
        
        assert bill is not None
        assert bill.total_liters == Decimal("0")
        assert bill.total_amount == Decimal("0.00")
        assert bill.status == "UNPAID"
    
    @pytest.mark.asyncio
    async def test_bill_generation_null_price(self, db_session):
        """Test bill generation with NULL price_per_liter (should not crash)."""
        from app.models.user import User
        
        user = User(
            id=uuid4(),
            email="test_null_price@example.com",
            name="Test Null Price",
            role="USER",
            price_per_liter=None,  # NULL price
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()
        
        # This should not crash - should default to 0
        bill = await generate_bill_for_user(
            db_session, 
            user.id, 
            "2026-01",
            enqueue_pdf=False
        )
        
        assert bill is not None
        assert bill.total_amount == Decimal("0.00")
    
    @pytest.mark.asyncio
    async def test_bill_update_existing(self, db_session):
        """Test that generating a bill updates existing one."""
        from app.models.user import User
        from app.models.bill import Bill
        
        user = User(
            id=uuid4(),
            email="test_update@example.com",
            name="Test Update",
            role="USER",
            price_per_liter=Decimal("50.00"),
            is_active=True
        )
        db_session.add(user)
        await db_session.flush()
        
        # Create existing bill
        existing_bill = Bill(
            id=uuid4(),
            user_id=user.id,
            month="2026-01",
            total_liters=Decimal("10.0"),
            total_amount=Decimal("500.00"),
            status="UNPAID"
        )
        db_session.add(existing_bill)
        await db_session.commit()
        
        # Generate bill again with more consumption
        with patch('app.workers.tasks.generate_and_upload_pdf'):
            bill = await generate_bill_for_user(
                db_session, 
                user.id, 
                "2026-01",
                enqueue_pdf=False
            )
        
        assert bill is not None
        # Bill should be updated (same ID)
        assert bill.id == existing_bill.id
        # Should be UNPAID (not PAID)
        assert bill.status == "UNPAID"
    
    @pytest.mark.asyncio
    async def test_bill_generation_user_not_found(self, db_session):
        """Test that non-existent user raises ValueError."""
        from uuid import uuid4
        
        with pytest.raises(ValueError, match="User not found"):
            await generate_bill_for_user(
                db_session, 
                uuid4(),  # Non-existent user
                "2026-01",
                enqueue_pdf=False
            )


class TestBillingEdgeCases:
    """Edge case tests for billing service."""
    
    @pytest.mark.asyncio
    async def test_partial_month_consumption(self, db_session):
        """Test bill with consumption only on some days."""
        from app.models.user import User
        from app.models.consumption import Consumption
        
        user = User(
            id=uuid4(),
            email="test_partial@example.com",
            name="Test Partial",
            role="USER",
            price_per_liter=Decimal("55.00"),
            is_active=True
        )
        db_session.add(user)
        
        # Add consumption only on certain days
        consumptions = [
            (1, 5.0),   # Day 1: 5L
            (5, 3.5),   # Day 5: 3.5L
            (15, 4.0),  # Day 15: 4L
            (28, 2.0),  # Day 28: 2L
        ]
        for day, qty in consumptions:
            c = Consumption(
                id=uuid4(),
                user_id=user.id,
                date=date(2026, 1, day),
                quantity=Decimal(str(qty))
            )
            db_session.add(c)
        
        await db_session.commit()
        
        with patch('app.workers.tasks.generate_and_upload_pdf'):
            bill = await generate_bill_for_user(
                db_session, 
                user.id, 
                "2026-01",
                enqueue_pdf=False
            )
        
        expected_liters = Decimal("14.5")  # 5 + 3.5 + 4 + 2
        expected_amount = expected_liters * Decimal("55.00")
        
        assert bill.total_liters == expected_liters
        assert bill.total_amount == expected_amount
    
    @pytest.mark.asyncio
    async def test_very_small_quantity(self, db_session):
        """Test with very small milk quantities."""
        from app.models.user import User
        from app.models.consumption import Consumption
        
        user = User(
            id=uuid4(),
            email="test_small@example.com",
            name="Test Small",
            role="USER",
            price_per_liter=Decimal("100.00"),
            is_active=True
        )
        db_session.add(user)
        
        # Add tiny consumption
        c = Consumption(
            id=uuid4(),
            user_id=user.id,
            date=date(2026, 1, 1),
            quantity=Decimal("0.001")
        )
        db_session.add(c)
        await db_session.commit()
        
        with patch('app.workers.tasks.generate_and_upload_pdf'):
            bill = await generate_bill_for_user(
                db_session, 
                user.id, 
                "2026-01",
                enqueue_pdf=False
            )
        
        assert bill.total_liters == Decimal("0.001")
        assert bill.total_amount == Decimal("0.10")  # Rounded to 2 decimals

