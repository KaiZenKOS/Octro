"""Personal no-debt engine (ENG-01, ENG-02, PER-01, PER-02, PER-05).

MPC over a 30-day personal horizon (chapter 13). The only P0 personal
decision modeled here is a same-owner transfer of already available
funds between the user's own accounts: essential expenses and protected
reserves are hard constraints that are never silently relaxed or moved
to manufacture a solution (chapter 13, PER-02).

This module has no knowledge of HTTP, Postgres or XRPL. It takes a
plain snapshot (dict, matching docs/v2.2/personal.fixture.json) and
returns a plan or a diagnostic — never both, never a partial action.
"""
import hashlib
import json
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional

from .money import quantize, quantize_up, to_decimal

DEFAULT_HORIZON_DAYS = 30


def _event_delta(event: dict) -> Decimal:
    if "inflow" in event and "outflow" in event:
        raise ValueError("an event must not declare both inflow and outflow")
    if "inflow" in event:
        return to_decimal(event["inflow"])
    if "outflow" in event:
        return -to_decimal(event["outflow"])
    raise ValueError("event must declare an inflow or an outflow")


def build_balance_trace(
    opening_balance: Decimal, events: List[dict], horizon_days: int
) -> Dict[int, Decimal]:
    """Balance of one account at the close of every day in [0, horizon_days].

    Daily step (chapter 13: "t ... quotidien"). A day's events are all
    applied together at that day's close, which is the same convention
    used to size the transfer below.
    """
    trace = {0: opening_balance}
    balance = opening_balance
    for day in range(1, horizon_days + 1):
        for event in events:
            if event["day"] == day:
                balance = balance + _event_delta(event)
        trace[day] = balance
    return trace


@dataclass
class NoDebtPlan:
    status: str
    plan_id: str
    proposed_actions: List[dict]
    current_balance_trace: Dict[int, Decimal]
    savings_remaining: Decimal
    new_debt: Decimal = Decimal("0.00")

    def current_at(self, day: int) -> Decimal:
        return self.current_balance_trace[day]


@dataclass
class NoDebtDiagnostic:
    status: str
    plan_id: str
    deficit: Decimal
    binding_constraints: List[str]
    reason: str
    proposed_actions: List[dict] = field(default_factory=list)


def _snapshot_hash(fixture: dict, params_version: str) -> str:
    canonical = json.dumps(fixture, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256((canonical + "|" + params_version).encode("utf-8")).hexdigest()
    return digest[:12]


def plan_personal_no_debt(
    fixture: dict,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    savings_protected_reserve: Optional[Decimal] = None,
    params_version: str = "v2.2-a2",
) -> "NoDebtPlan | NoDebtDiagnostic":
    """ENG-01/ENG-02/PER-01/PER-02/PER-05.

    savings_protected_reserve: floor below which the savings account
    must never fall. Defaults to 0 (matching docs/v2.2/personal.fixture.json,
    whose own `expected` block leaves savings unprotected). Passing the
    fixture's opening savings balance reproduces the "fully protected
    savings" scenario from TEAM_TASKS.md section 5, which must return a
    diagnostic instead of a transfer.
    """
    asset_id = fixture["asset_id"]
    opening_current = to_decimal(fixture["opening_balances"]["current"])
    opening_savings = to_decimal(fixture["opening_balances"]["savings"])
    current_reserve = to_decimal(fixture["current_reserve"])
    protected_savings = (
        to_decimal(savings_protected_reserve)
        if savings_protected_reserve is not None
        else Decimal("0")
    )
    events = fixture["events"]

    plan_id = f"{fixture.get('id', 'personal')}-{_snapshot_hash(fixture, params_version)}"

    trace_without_transfer = build_balance_trace(opening_current, events, horizon_days)
    min_balance = min(trace_without_transfer.values())
    deficit = current_reserve - min_balance

    if deficit <= 0:
        # Essential expenses already stay clear of the protected reserve.
        return NoDebtPlan(
            status="FEASIBLE_NO_DEBT",
            plan_id=plan_id,
            proposed_actions=[{"type": "no_action"}],
            current_balance_trace=trace_without_transfer,
            savings_remaining=quantize(opening_savings),
            new_debt=Decimal("0.00"),
        )

    unprotected_savings = opening_savings - protected_savings
    if unprotected_savings < deficit:
        # PER-02/PER-05: the protected reserve is a hard constraint. No
        # automatic consumption below it, and no invented alternative.
        return NoDebtDiagnostic(
            status="INFEASIBLE_NO_DEBT",
            plan_id=plan_id,
            deficit=quantize(deficit),
            binding_constraints=[
                "current_reserve",
                "savings_protected_reserve" if protected_savings > 0 else "savings_available",
            ],
            reason=(
                "Le transfert de fonds propres necessaire pour proteger "
                f"la reserve courante ({quantize(current_reserve)} {asset_id}) "
                f"depasserait l'epargne disponible sans breche de sa reserve "
                f"protegee ({quantize(protected_savings)} {asset_id})."
            ),
        )

    # ENG-02: round the transfer up so the rounded amount still clears
    # the reserve, then re-verify the constraint with the rounded value.
    transfer_amount = quantize_up(deficit)
    if transfer_amount > unprotected_savings:
        # The rounded amount itself must remain funded. A raw deficit that
        # exactly fits the source balance may still round up past it.
        return NoDebtDiagnostic(
            status="INFEASIBLE_NO_DEBT",
            plan_id=plan_id,
            deficit=quantize(deficit),
            binding_constraints=[
                "current_reserve",
                "savings_protected_reserve" if protected_savings > 0 else "savings_available",
            ],
            reason=(
                "L'arrondi necessaire pour proteger la reserve courante depasse "
                "les fonds propres mobilisables sans enfreindre la reserve protegee."
            ),
        )
    trace_with_transfer = build_balance_trace(
        opening_current + transfer_amount, events, horizon_days
    )
    if min(trace_with_transfer.values()) < current_reserve:
        raise AssertionError(
            "rounding re-verification failed: rounded transfer still breaches "
            "the protected reserve; this must never be exposed as executable"
        )

    savings_remaining = quantize(opening_savings - transfer_amount)

    return NoDebtPlan(
        status="FEASIBLE_NO_DEBT",
        plan_id=plan_id,
        proposed_actions=[
            {
                "type": "own_funds_transfer",
                "source_account_ref": "savings",
                "destination_account_ref": "current",
                "asset_id": asset_id,
                "amount_decimal": str(transfer_amount),
            }
        ],
        current_balance_trace=trace_with_transfer,
        savings_remaining=savings_remaining,
        new_debt=Decimal("0.00"),
    )
