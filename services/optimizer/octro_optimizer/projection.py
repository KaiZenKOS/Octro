"""Normalized personal projection entry point used by the API subprocess.

All monetary values arrive as decimal strings. This module owns both the
cashflow trace and no-debt feasibility calculation so TypeScript never
duplicates financial arithmetic.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List

from .money import to_decimal
from .personal_engine import NoDebtDiagnostic, NoDebtPlan, plan_personal_no_debt

ENGINE_VERSION = "octro-personal-v2.2-1"
def _parse_instant(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("all event timestamps must include a timezone")
    return parsed.astimezone(timezone.utc)


def _event_day(event: dict, as_of: datetime) -> int:
    if event["status"] == "settled":
        event_at = _parse_instant(event["observed_at"])
        if event_at <= as_of:
            return 0  # already reflected in the opening cash snapshot
    else:
        event_at = _parse_instant(
            event.get("expected_settlement_at") or event["observed_at"]
        )
    return max(1, (event_at.date() - as_of.date()).days)


def calculate_personal_projection(snapshot: dict) -> dict:
    """Run the no-debt engine and build the daily expected/confirmed trace."""
    tenant_id = snapshot["tenant_id"]
    asset_id = snapshot["asset_id"]
    as_of = _parse_instant(snapshot["as_of"])
    horizon = snapshot["horizon"]
    steps = horizon["steps"]

    if horizon["unit"] != "day" or not isinstance(steps, int) or not (1 <= steps <= 30):
        raise ValueError("personal projection horizon must be 1..30 day steps")

    opening_current = snapshot["opening_balances"]["current"]
    opening_savings = snapshot["opening_balances"]["savings"]
    current_reserve = snapshot["current_reserve"]
    savings_protected_reserve = snapshot["savings_protected_reserve"]
    for amount in (opening_current, opening_savings, current_reserve, savings_protected_reserve):
        if not isinstance(amount, str):
            raise TypeError("all monetary values must be decimal strings (DATA-03)")
        if to_decimal(amount) < 0:
            raise ValueError("balances and reserves must be non-negative")

    events = snapshot["events"]
    source_keys = set()
    plan_events: List[dict] = []
    expected_by_day: Dict[int, Decimal] = {}
    confirmed_by_day: Dict[int, Decimal] = {}
    for event in events:
        if event["tenant_id"] != tenant_id:
            raise ValueError("cross-tenant event in projection snapshot (SEC-01)")
        key = (event.get("connection_ref"), event["source_event_id"])
        if key in source_keys:
            raise ValueError("duplicate source_event_id in projection snapshot (DATA-01)")
        source_keys.add(key)
        if event["status"] == "cancelled":
            continue
        if event["amount"]["asset_id"] != asset_id:
            raise ValueError("projection cannot combine different assets without an explicit FX model")
        amount = event["amount"]["amount_decimal"]
        if not isinstance(amount, str):
            raise TypeError("event amount must be a decimal string (DATA-03)")
        magnitude = to_decimal(amount)
        if magnitude < 0:
            raise ValueError("event amount must be non-negative")
        delta = magnitude if event["direction"] == "inflow" else -magnitude
        day = _event_day(event, as_of)
        if day > steps or day == 0:
            continue
        if event["status"] == "settled":
            confirmed_by_day[day] = confirmed_by_day.get(day, Decimal("0")) + delta
        else:
            expected_by_day[day] = expected_by_day.get(day, Decimal("0")) + delta
            plan_events.append({
                "day": day,
                "inflow" if delta > 0 else "outflow": str(abs(delta)),
                "label": event["label"],
                "source_event_id": event["source_event_id"],
            })

    plan_fixture = {
        "id": f"{tenant_id}-personal",
        "asset_id": asset_id,
        "opening_balances": {"current": opening_current, "savings": opening_savings},
        "current_reserve": current_reserve,
        "events": plan_events,
    }
    engine_result = plan_personal_no_debt(
        plan_fixture,
        horizon_days=steps,
        savings_protected_reserve=to_decimal(savings_protected_reserve),
        params_version=ENGINE_VERSION,
    )

    expected_running = to_decimal(opening_current)
    confirmed_running = to_decimal(opening_current)
    trace = [{
        "t": 0,
        "expected_balance_decimal": str(expected_running),
        "confirmed_balance_decimal": str(confirmed_running),
    }]
    for day in range(1, steps + 1):
        expected_running += expected_by_day.get(day, Decimal("0"))
        confirmed_running += confirmed_by_day.get(day, Decimal("0"))
        trace.append({
            "t": day,
            "expected_balance_decimal": str(expected_running),
            "confirmed_balance_decimal": str(confirmed_running),
        })

    if isinstance(engine_result, NoDebtPlan):
        action_trace = [
            {
                "t": day,
                "current_balance_decimal": str(engine_result.current_balance_trace[day]),
                "savings_balance_decimal": str(engine_result.savings_remaining),
            }
            for day in range(steps + 1)
        ]
        return {
            "engine_version": ENGINE_VERSION,
            "status": "FEASIBLE",
            "trace": trace,
            "action_trace": action_trace,
            "proposed_actions": engine_result.proposed_actions,
            "savings_remaining_decimal": str(engine_result.savings_remaining),
            "diagnostic": None,
        }
    if isinstance(engine_result, NoDebtDiagnostic):
        return {
            "engine_version": ENGINE_VERSION,
            "status": "INFEASIBLE",
            "trace": trace,
            "action_trace": [],
            "proposed_actions": [],
            "savings_remaining_decimal": None,
            "diagnostic": {
                "deficit_decimal": str(engine_result.deficit),
                "binding_constraints": engine_result.binding_constraints,
                "reason": engine_result.reason,
            },
        }
    raise TypeError("personal engine returned an unsupported result")
