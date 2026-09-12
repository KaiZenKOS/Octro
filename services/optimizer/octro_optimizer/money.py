"""Decimal-only money helpers.

DATA-03 requires decimal amounts and refuses float. This module is the
single place that quantizes and rounds; every other module works with
Decimal end to end and never touches float.
"""
from decimal import Decimal, ROUND_HALF_UP, ROUND_UP

TWO_PLACES = Decimal("0.01")


def to_decimal(value):
    """Coerce a str/int/Decimal into Decimal. Rejects float explicitly."""
    if isinstance(value, float):
        raise TypeError(
            "float amounts are refused (DATA-03); pass a str or Decimal"
        )
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def quantize(value, precision=TWO_PLACES, rounding=ROUND_HALF_UP):
    return to_decimal(value).quantize(precision, rounding=rounding)


def quantize_up(value, precision=TWO_PLACES):
    """Round towards the direction that never understates an obligation.

    ENG-02: constraints are re-verified after rounding. A transfer or
    drawdown amount must be rounded up so the rounded amount still
    satisfies the reserve/coverage constraint it was sized for.
    """
    return to_decimal(value).quantize(precision, rounding=ROUND_UP)


def as_str(value, precision=TWO_PLACES):
    return str(quantize(value, precision))
