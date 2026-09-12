"""Financing comparison and terminal debt (ENG-04, ENG-05, chapter 14).

The MVP min-cost flow is a simple LP without fixed fees or multi-asset
conversion (chapter 14): given a need and a set of rate-capped offers,
allocate cheapest-rate-first. This greedy allocation is optimal for a
single linear resource with capacity constraints, which is exactly the
chapter 14 example (offer A capped at 60000 @4.2%, offer B @4.8%).
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional

from .money import quantize, to_decimal

HOURS_PER_DAY = 24


@dataclass
class FinancingOffer:
    name: str
    annual_rate: Decimal  # e.g. Decimal("0.042") for 4.2%
    cap: Optional[Decimal] = None  # None = uncapped for this comparison


@dataclass
class FinancingAllocation:
    offer_name: str
    principal: Decimal
    annual_rate: Decimal
    interest_cost: Decimal  # unrounded, summed before the single global rounding


@dataclass
class FinancingPlan:
    status: str
    need: Decimal
    hours: Decimal
    allocations: List[FinancingAllocation]
    total_interest_cost: Decimal


@dataclass
class FinancingDiagnostic:
    status: str
    need: Decimal
    available_capacity: Decimal
    deficit: Decimal
    binding_constraints: List[str] = field(default_factory=lambda: ["credit_cap"])


def simple_interest_cost(principal: Decimal, annual_rate: Decimal, hours: Decimal, day_basis: int = 365) -> Decimal:
    """ACT/{day_basis} simple interest, unrounded (chapter 14)."""
    return principal * annual_rate * hours / (Decimal(day_basis) * HOURS_PER_DAY)


def compare_financing(
    need,
    hours,
    offers: List[FinancingOffer],
    day_basis: int = 365,
) -> "FinancingPlan | FinancingDiagnostic":
    """ENG-04: infeasibility returns INFEASIBLE with no financial action.

    Offers are tried cheapest rate first; a need exceeding the combined
    caps returns a diagnostic instead of an order (no order is ever
    fabricated to force a feasible-looking answer).
    """
    need = to_decimal(need)
    hours = to_decimal(hours)
    if need <= 0:
        return FinancingPlan(
            status="FEASIBLE_NO_DRAW",
            need=need,
            hours=hours,
            allocations=[],
            total_interest_cost=Decimal("0.00"),
        )

    ordered = sorted(offers, key=lambda o: o.annual_rate)
    remaining = need
    allocations: List[FinancingAllocation] = []
    for offer in ordered:
        if remaining <= 0:
            break
        cap = offer.cap if offer.cap is not None else remaining
        take = cap if cap < remaining else remaining
        if take <= 0:
            continue
        cost = simple_interest_cost(take, offer.annual_rate, hours, day_basis)
        allocations.append(
            FinancingAllocation(
                offer_name=offer.name,
                principal=take,
                annual_rate=offer.annual_rate,
                interest_cost=cost,
            )
        )
        remaining -= take

    if remaining > 0:
        available_capacity = need - remaining
        return FinancingDiagnostic(
            status="INFEASIBLE",
            need=need,
            available_capacity=quantize(available_capacity),
            deficit=quantize(remaining),
        )

    # ENG-02 applies here too, but for a cost figure the global rounding
    # is a plain round-to-nearest on the summed unrounded legs, not a
    # round-up: chapter 14's worked example is only reproduced with a
    # single rounding of the total, not per-leg rounding.
    total_unrounded = sum((a.interest_cost for a in allocations), Decimal("0"))
    return FinancingPlan(
        status="FEASIBLE",
        need=need,
        hours=hours,
        allocations=allocations,
        total_interest_cost=quantize(total_unrounded),
    )


@dataclass
class AmortizationState:
    outstanding_principal: Decimal
    terminal_debt: Decimal  # what remains at the end of the modeled horizon


def run_amortization(
    principal: Decimal,
    scheduled_payments: List[Decimal],
    horizon_hours: Decimal,
    payment_interval_hours: Decimal,
) -> AmortizationState:
    """ENG-05: debt remaining after the horizon is a terminal obligation.

    scheduled_payments are applied in order at payment_interval_hours
    spacing; any payment whose due time falls after horizon_hours is not
    applied by this model run, and the remaining principal is returned
    as terminal_debt rather than being dropped to zero.
    """
    outstanding = to_decimal(principal)
    horizon_hours = to_decimal(horizon_hours)
    payment_interval_hours = to_decimal(payment_interval_hours)

    due_time = Decimal("0")
    for payment in scheduled_payments:
        due_time += payment_interval_hours
        if due_time > horizon_hours:
            break
        outstanding -= to_decimal(payment)
        if outstanding < 0:
            outstanding = Decimal("0")

    return AmortizationState(
        outstanding_principal=quantize(outstanding),
        terminal_debt=quantize(outstanding),
    )
