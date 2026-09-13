import unittest
from decimal import Decimal

from octro_optimizer.cvar import compute_cvar


class TestCvar(unittest.TestCase):
    """ENG-03: fixture pertes 0/0/100, poids 0.80/0.15/0.05 -> CVaR95 100."""

    def test_pack_fixture_cvar95(self):
        cvar = compute_cvar(
            losses=["0", "0", "100"],
            weights=["0.80", "0.15", "0.05"],
            alpha="0.95",
        )
        self.assertEqual(cvar, Decimal("100"))

    def test_rejects_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            compute_cvar(losses=[1, 2], weights=[1], alpha="0.95")

    def test_rejects_weights_not_summing_to_one(self):
        with self.assertRaises(ValueError):
            compute_cvar(losses=[1, 2], weights=["0.5", "0.4"], alpha="0.95")

    def test_zero_loss_scenarios_give_zero_cvar(self):
        cvar = compute_cvar(losses=["0", "0", "0"], weights=["0.5", "0.3", "0.2"], alpha="0.95")
        self.assertEqual(cvar, Decimal("0"))

    def test_uniform_worst_case_tail(self):
        # Tail mass spans two scenarios: 0.03 fully from the worst loss
        # (200) plus 0.02 from the next one (150), weighted average.
        cvar = compute_cvar(
            losses=["200", "150", "0"],
            weights=["0.03", "0.02", "0.95"],
            alpha="0.95",
        )
        expected = (Decimal("0.03") * 200 + Decimal("0.02") * 150) / Decimal("0.05")
        self.assertEqual(cvar, expected)


if __name__ == "__main__":
    unittest.main()
