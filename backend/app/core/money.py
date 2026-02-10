"""Central Money utilities for DairyOS.

Provides consistent monetary handling with:
- Decimal-based calculations
- Banker's rounding (ROUND_HALF_EVEN)
- Currency formatting for INR
- Tax calculation support
"""
from decimal import Decimal, ROUND_HALF_EVEN
from dataclasses import dataclass

# Rounding policy: Banker's rounding for financial accuracy
DEFAULT_ROUNDING = ROUND_HALF_EVEN
DECIMAL_PRECISION = Decimal("0.01")  # 2 decimal places for currency
LITER_PRECISION = Decimal("0.001")   # 3 decimal places for quantity


@dataclass(frozen=True)
class Money:
    """Immutable Money value object.

    Ensures all monetary values are properly rounded to 2 decimal places
    using banker's rounding (ROUND_HALF_EVEN) for financial accuracy.
    """
    amount: Decimal

    def __post_init__(self):
        # Ensure amount is properly quantized
        quantized = self.amount.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING)
        object.__setattr__(self, 'amount', quantized)

    @classmethod
    def from_float(cls, value: float) -> "Money":
        """Create Money from a float value."""
        return cls(Decimal(str(value)))

    @classmethod
    def from_int_cents(cls, cents: int) -> "Money":
        """Create Money from integer cents (e.g., 1500 -> ₹15.00)."""
        return cls(Decimal(cents) / Decimal("100"))

    @classmethod
    def zero(cls) -> "Money":
        """Create zero money."""
        return cls(Decimal("0"))

    def __repr__(self) -> str:
        return f"Money({self.amount})"

    def __str__(self) -> str:
        return self.to_str()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount == other.amount

    def __ne__(self, other: object) -> bool:
        return not self.__eq__(other)

    def __lt__(self, other: "Money") -> bool:
        return self.amount < other.amount

    def __le__(self, other: "Money") -> bool:
        return self.amount <= other.amount

    def __gt__(self, other: "Money") -> bool:
        return self.amount > other.amount

    def __ge__(self, other: "Money") -> bool:
        return self.amount >= other.amount

    def __add__(self, other: "Money") -> "Money":
        return Money(self.amount + other.amount)

    def __sub__(self, other: "Money") -> "Money":
        return Money(self.amount - other.amount)

    def __mul__(self, other: Decimal) -> "Money":
        if other < 0:
            raise ValueError("Cannot multiply by negative amount")
        return Money((self.amount * other).quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))

    def __rmul__(self, other: Decimal) -> "Money":
        return self.__mul__(other)

    def __truediv__(self, other: Decimal) -> "Money":
        if other <= 0:
            raise ValueError("Cannot divide by zero or negative")
        result = self.amount / other
        return Money(result.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))

    def __hash__(self) -> int:
        return hash(self.amount)

    def is_zero(self) -> bool:
        """Check if this money is zero."""
        return self.amount == Decimal("0")

    def is_positive(self) -> bool:
        """Check if this money is positive."""
        return self.amount > Decimal("0")

    def to_cents(self) -> int:
        """Convert to integer cents."""
        return int(self.amount * Decimal("100"))

    def to_str(self, currency: str = "INR") -> str:
        """Format as Indian Rupee string (e.g., ₹1,23,456.78)."""
        s = f"{self.amount:.2f}"
        parts = s.split(".")
        integer_part = parts[0]

        # Indian numbering: first comma after 3 digits from right, then every 2 digits
        if len(integer_part) <= 3:
            return f"₹{integer_part}.{parts[1]}"

        # Split into last 3 digits and the rest
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]

        # Add commas every 2 digits in the remaining part (from right to left)
        result = ""
        for i, digit in enumerate(reversed(remaining)):
            if i > 0 and i % 2 == 0:
                result = "," + result
            result = digit + result

        return f"₹{result},{last_three}.{parts[1]}"

    def to_json(self) -> str:
        """Return JSON-serializable string representation."""
        return str(self.amount)


def calculate_amount(quantity: Decimal, unit_price: Decimal) -> Money:
    """Calculate total amount with proper Decimal precision.

    Args:
        quantity: Amount of liters (will be rounded to 3 decimal places)
        unit_price: Price per liter (will be rounded to 3 decimal places)

    Returns:
        Money object with properly rounded total amount
    """
    qty = quantity.quantize(LITER_PRECISION, rounding=DEFAULT_ROUNDING)
    price = unit_price.quantize(LITER_PRECISION, rounding=DEFAULT_ROUNDING)
    amount = qty * price
    return Money(amount.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))


def round_liters(liters: float) -> Decimal:
    """Round liters to 3 decimal places."""
    return Decimal(str(liters)).quantize(LITER_PRECISION, rounding=DEFAULT_ROUNDING)


def round_price(price: float) -> Decimal:
    """Round price to 3 decimal places."""
    return Decimal(str(price)).quantize(LITER_PRECISION, rounding=DEFAULT_ROUNDING)


def format_currency(amount: Decimal) -> str:
    """Format a Decimal amount as an Indian Rupee string.

    This is a utility function for backward compatibility.
    Use Money.to_str() for new code.
    """
    money = Money(amount)
    return money.to_str()


# Tax calculation utilities
def calculate_tax(subtotal: Money, tax_rate: Decimal) -> Money:
    """Calculate tax amount given a subtotal and tax rate.

    Args:
        subtotal: The subtotal amount
        tax_rate: Tax rate as decimal (e.g., 0.18 for 18% GST)

    Returns:
        Money object with tax amount
    """
    if tax_rate < 0 or tax_rate > 1:
        raise ValueError("Tax rate must be between 0 and 1")

    tax_amount = subtotal.amount * tax_rate
    return Money(tax_amount.quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING))


def calculate_total_with_tax(subtotal: Money, tax_rate: Decimal) -> Money:
    """Calculate total including tax.

    Args:
        subtotal: The subtotal amount
        tax_rate: Tax rate as decimal (e.g., 0.18 for 18% GST)

    Returns:
        Money object with total including tax
    """
    tax = calculate_tax(subtotal, tax_rate)
    return subtotal + tax


# Percentage calculations
def calculate_percentage(amount: Money, percent: Decimal) -> Money:
    """Calculate a percentage of an amount.

    Args:
        amount: The base amount
        percent: Percentage as decimal (e.g., 0.05 for 5%)

    Returns:
        Money object with the calculated percentage
    """
    if percent < 0:
        raise ValueError("Percentage cannot be negative")
    result = (amount.amount * percent).quantize(DECIMAL_PRECISION, rounding=DEFAULT_ROUNDING)
    return Money(result)


# Discount calculations
def apply_discount(amount: Money, discount_percent: Decimal) -> Money:
    """Apply a percentage discount to an amount.

    Args:
        amount: The original amount
        discount_percent: Discount percentage as decimal (e.g., 0.10 for 10% off)

    Returns:
        Money object with discounted amount
    """
    if discount_percent < 0 or discount_percent > 1:
        raise ValueError("Discount must be between 0 and 1")

    discount = calculate_percentage(amount, discount_percent)
    return amount - discount

