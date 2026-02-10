"""
Lock rule tests for DairyOS.
Tests the 7-day lock rule for consumption editing.
"""

from datetime import date, timedelta


def test_date_locking_logic():
    """Test 7-day lock rule logic."""
    from app.api.deps import is_date_locked
    
    today = date.today()
    
    # Should NOT be locked (today and last 6 days)
    assert not is_date_locked(today)
    assert not is_date_locked(today - timedelta(days=1))
    assert not is_date_locked(today - timedelta(days=6))
    
    # Should be locked (8 days ago and older)
    assert is_date_locked(today - timedelta(days=7))
    assert is_date_locked(today - timedelta(days=8))
    assert is_date_locked(today - timedelta(days=30))
    assert is_date_locked(today - timedelta(days=365))


def test_lock_date_calculation():
    """Test lock date calculation."""
    from app.api.deps import is_date_locked
    
    today = date.today()
    lock_threshold = today - timedelta(days=7)
    
    # Test boundary conditions
    assert not is_date_locked(lock_threshold + timedelta(days=1))
    assert is_date_locked(lock_threshold)


def test_lock_rule_enforcement():
    """Test that the lock rule is enforced correctly."""
    from app.api.deps import is_date_locked
    
    test_cases = [
        # (date, should_be_locked)
        (date.today(), False),
        (date.today() - timedelta(days=1), False),
        (date.today() - timedelta(days=6), False),
        (date.today() - timedelta(days=7), True),
        (date.today() - timedelta(days=8), True),
        (date.today() - timedelta(days=30), True),
    ]
    
    for test_date, expected_locked in test_cases:
        result = is_date_locked(test_date)
        assert result == expected_locked, (
            f"Date {test_date} should {'be' if expected_locked else 'not be'} locked"
        )


def test_consumption_lock_implication():
    """Test that consumption locking works with the date logic."""
    from app.api.deps import is_date_locked
    
    today = date.today()
    
    # Today's consumption should not be locked
    assert not is_date_locked(today)
    
    # Consumption from 7 days ago should be locked
    seven_days_ago = today - timedelta(days=7)
    assert is_date_locked(seven_days_ago)
    
    # Consumption from 8 days ago should be locked
    eight_days_ago = today - timedelta(days=8)
    assert is_date_locked(eight_days_ago)


def test_lock_boundary_edge_cases():
    """Test edge cases around the lock boundary."""
    from app.api.deps import is_date_locked
    
    today = date.today()
    
    # Just before lock threshold (should not be locked)
    just_before = today - timedelta(days=6, hours=23, minutes=59)
    assert not is_date_locked(just_before)
    
    # At lock threshold (should be locked)
    at_threshold = today - timedelta(days=7)
    assert is_date_locked(at_threshold)
    
    # Just after lock threshold (should be locked)
    just_after = today - timedelta(days=7, seconds=1)
    assert is_date_locked(just_after)

