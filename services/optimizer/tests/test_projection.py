import unittest

from octro_optimizer.projection import calculate_personal_projection


TENANT = "11111111-1111-4111-8111-111111111111"
AS_OF = "2026-09-12T00:00:00Z"


def event(source_event_id, direction, amount, day, *, label=None):
    return {
        "id": f"event-{source_event_id}",
        "tenant_id": TENANT,
        "source_event_id": source_event_id,
        "direction": direction,
        "amount": {"amount_decimal": amount, "asset_id": "fiat:EUR"},
        "status": "expected",
        "verification": "declared",
        "label": label or source_event_id,
        "observed_at": AS_OF,
        "expected_settlement_at": f"2026-09-{12 + day:02}T00:00:00Z",
    }


def snapshot(events):
    return {
        "tenant_id": TENANT,
        "asset_id": "fiat:EUR",
        "as_of": AS_OF,
        "opening_balances": {"current": "650.00", "savings": "300.00"},
        "current_reserve": "100.00",
        "savings_protected_reserve": "0.00",
        "horizon": {"steps": 30, "unit": "day"},
        "events": events,
    }


class TestPersonalProjection(unittest.TestCase):
    def setUp(self):
        self.events = [
            event("rent", "outflow", "600.00", 2, label="Loyer"),
            event("food", "outflow", "100.00", 4, label="Courses"),
            event("transport", "outflow", "80.00", 6, label="Transport"),
            event("salary", "inflow", "1600.00", 10, label="Salaire"),
        ]

    def test_lina_returns_230_eur_transfer_and_expected_trace(self):
        result = calculate_personal_projection(snapshot(self.events))
        self.assertEqual(result["status"], "FEASIBLE")
        self.assertEqual(result["proposed_actions"][0]["amount_decimal"], "230.00")
        self.assertEqual(result["trace"][9]["expected_balance_decimal"], "-130.00")
        self.assertEqual(result["trace"][10]["expected_balance_decimal"], "1470.00")
        self.assertEqual(result["proposed_actions"][0]["type"], "own_funds_transfer")

    def test_unexpected_150_eur_expense_is_infeasible_without_380_action(self):
        all_events = [*self.events, event("unexpected", "outflow", "150.00", 8)]
        result = calculate_personal_projection(snapshot(all_events))
        self.assertEqual(result["status"], "INFEASIBLE")
        self.assertEqual(result["proposed_actions"], [])
        self.assertEqual(result["diagnostic"]["deficit_decimal"], "380.00")

    def test_float_money_and_cross_tenant_event_are_rejected(self):
        invalid = snapshot(self.events)
        invalid["opening_balances"]["current"] = 650.0
        with self.assertRaises(TypeError):
            calculate_personal_projection(invalid)

        invalid = snapshot(self.events)
        invalid["events"][0]["tenant_id"] = "22222222-2222-4222-8222-222222222222"
        with self.assertRaises(ValueError):
            calculate_personal_projection(invalid)


if __name__ == "__main__":
    unittest.main()
