import json
import os
import unittest
from decimal import Decimal

from octro_optimizer.personal_engine import (
    NoDebtDiagnostic,
    NoDebtPlan,
    plan_personal_no_debt,
)

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "docs", "v2.2", "personal.fixture.json"
)


def load_fixture():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


class TestLinaNoDebtPlan(unittest.TestCase):
    """PER-01: docs/v2.2/personal.fixture.json, 230 EUR transfer, no debt."""

    def setUp(self):
        self.fixture = load_fixture()
        self.expected = self.fixture["expected"]

    def test_transfer_amount_matches_fixture(self):
        plan = plan_personal_no_debt(self.fixture)
        self.assertIsInstance(plan, NoDebtPlan)
        action = plan.proposed_actions[0]
        self.assertEqual(action["type"], "own_funds_transfer")
        self.assertEqual(action["source_account_ref"], "savings")
        self.assertEqual(action["destination_account_ref"], "current")
        self.assertEqual(action["amount_decimal"], self.expected["own_funds_transfer"])

    def test_current_before_salary(self):
        plan = plan_personal_no_debt(self.fixture)
        # Salary lands on day 10 in the fixture; the balance just before
        # that is the lowest point the transfer was sized to protect.
        self.assertEqual(str(plan.current_at(9)), self.expected["current_before_salary"])

    def test_current_after_salary(self):
        plan = plan_personal_no_debt(self.fixture)
        self.assertEqual(str(plan.current_at(10)), self.expected["current_after_salary"])

    def test_savings_remaining(self):
        plan = plan_personal_no_debt(self.fixture)
        self.assertEqual(str(plan.savings_remaining), self.expected["savings_remaining"])

    def test_total_after_salary(self):
        plan = plan_personal_no_debt(self.fixture)
        total = plan.current_at(10) + plan.savings_remaining
        self.assertEqual(str(total), self.expected["total_after_salary"])

    def test_no_new_debt(self):
        plan = plan_personal_no_debt(self.fixture)
        self.assertEqual(str(plan.new_debt), self.expected["new_debt"])

    def test_reproducible_same_snapshot_same_plan(self):
        # ENG-01: same snapshot and versions give the same plan.
        plan_a = plan_personal_no_debt(self.fixture)
        plan_b = plan_personal_no_debt(self.fixture)
        self.assertEqual(plan_a.plan_id, plan_b.plan_id)
        self.assertEqual(plan_a.proposed_actions, plan_b.proposed_actions)
        self.assertEqual(plan_a.current_balance_trace, plan_b.current_balance_trace)


class TestProtectedSavingsDiagnostic(unittest.TestCase):
    """PER-02/PER-05: a fully protected savings reserve blocks the
    automatic transfer instead of silently consuming it."""

    def setUp(self):
        self.fixture = load_fixture()

    def test_fully_protected_savings_returns_diagnostic_not_a_plan(self):
        protected = Decimal(self.fixture["opening_balances"]["savings"])  # 300.00
        result = plan_personal_no_debt(self.fixture, savings_protected_reserve=protected)
        self.assertIsInstance(result, NoDebtDiagnostic)
        self.assertEqual(result.status, "INFEASIBLE_NO_DEBT")
        self.assertIn("savings_protected_reserve", result.binding_constraints)
        self.assertEqual(result.proposed_actions, [])

    def test_no_essential_expense_or_reserve_is_silently_moved(self):
        protected = Decimal(self.fixture["opening_balances"]["savings"])
        result = plan_personal_no_debt(self.fixture, savings_protected_reserve=protected)
        # A diagnostic carries no proposed_actions: nothing executable
        # is ever returned when the constraint cannot be honored.
        self.assertEqual(result.proposed_actions, [])


class TestNoActionWhenAlreadySafe(unittest.TestCase):
    def test_no_transfer_when_reserve_never_breached(self):
        fixture = {
            "id": "safe-fixture",
            "asset_id": "fiat:EUR",
            "opening_balances": {"current": "1000.00", "savings": "300.00"},
            "current_reserve": "100.00",
            "events": [{"day": 5, "outflow": "50.00", "label": "misc"}],
        }
        plan = plan_personal_no_debt(fixture, horizon_days=30)
        self.assertIsInstance(plan, NoDebtPlan)
        self.assertEqual(plan.proposed_actions, [{"type": "no_action"}])
        self.assertEqual(str(plan.new_debt), "0.00")


if __name__ == "__main__":
    unittest.main()
