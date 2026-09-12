import unittest
from decimal import Decimal

from octro_optimizer.financing import (
    FinancingDiagnostic,
    FinancingOffer,
    FinancingPlan,
    compare_financing,
    run_amortization,
)


class TestChapter14WorkedExample(unittest.TestCase):
    """Chapter 14 pedagogical example: need 90000 for 36h, A capped at
    60000 @4.2%, B @4.8%. Expect a blended cost of 16.27 and 17.75 for
    B alone (both after a single global rounding of the summed cost)."""

    def setUp(self):
        self.offer_a = FinancingOffer(name="A", annual_rate=Decimal("0.042"), cap=Decimal("60000"))
        self.offer_b = FinancingOffer(name="B", annual_rate=Decimal("0.048"), cap=None)

    def test_blended_offer_cost(self):
        plan = compare_financing(need="90000", hours="36", offers=[self.offer_a, self.offer_b])
        self.assertIsInstance(plan, FinancingPlan)
        self.assertEqual(str(plan.total_interest_cost), "16.27")
        principals = {a.offer_name: a.principal for a in plan.allocations}
        self.assertEqual(principals["A"], Decimal("60000"))
        self.assertEqual(principals["B"], Decimal("30000"))

    def test_single_offer_b_cost(self):
        plan = compare_financing(need="90000", hours="36", offers=[self.offer_b])
        self.assertIsInstance(plan, FinancingPlan)
        self.assertEqual(str(plan.total_interest_cost), "17.75")

    def test_blended_offer_cheaper_than_single_offer(self):
        blended = compare_financing(need="90000", hours="36", offers=[self.offer_a, self.offer_b])
        single = compare_financing(need="90000", hours="36", offers=[self.offer_b])
        gain = single.total_interest_cost - blended.total_interest_cost
        self.assertEqual(str(gain), "1.48")


class TestInfeasibleCredit(unittest.TestCase):
    def test_need_90000_cap_80000_is_infeasible(self):
        """ENG-04: besoin 90000, plafond 80000 -> INFEASIBLE, sans action."""
        offer = FinancingOffer(name="only-offer", annual_rate=Decimal("0.05"), cap=Decimal("80000"))
        result = compare_financing(need="90000", hours="36", offers=[offer])
        self.assertIsInstance(result, FinancingDiagnostic)
        self.assertEqual(result.status, "INFEASIBLE")
        self.assertEqual(str(result.deficit), "10000.00")

    def test_zero_need_draws_nothing(self):
        result = compare_financing(need="0", hours="36", offers=[])
        self.assertIsInstance(result, FinancingPlan)
        self.assertEqual(result.allocations, [])


class TestTerminalDebt(unittest.TestCase):
    def test_debt_does_not_vanish_at_h72(self):
        """ENG-05: aucune dette disparait a H72."""
        state = run_amortization(
            principal=Decimal("1000.00"),
            scheduled_payments=[Decimal("100.00")] * 10,
            horizon_hours=Decimal("72"),
            payment_interval_hours=Decimal("24"),
        )
        # Only 3 of the 24h-spaced payments land within a 72h horizon.
        self.assertEqual(state.terminal_debt, Decimal("700.00"))
        self.assertGreater(state.terminal_debt, Decimal("0"))

    def test_fully_repaid_within_horizon_has_zero_terminal_debt(self):
        state = run_amortization(
            principal=Decimal("300.00"),
            scheduled_payments=[Decimal("100.00")] * 3,
            horizon_hours=Decimal("72"),
            payment_interval_hours=Decimal("24"),
        )
        self.assertEqual(state.terminal_debt, Decimal("0.00"))


if __name__ == "__main__":
    unittest.main()
