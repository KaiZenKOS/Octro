import json
import os
import unittest

from octro_optimizer.schema import build_plan_proposal, check_plan_proposal

EXAMPLE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "docs", "v2.2", "plan.example.json"
)


class TestPlanSchema(unittest.TestCase):
    def test_pack_example_is_valid(self):
        with open(EXAMPLE_PATH, "r", encoding="utf-8") as fh:
            example = json.load(fh)
        # Must not raise.
        check_plan_proposal(example)

    def test_build_lina_proposal_matches_pack_example_shape(self):
        proposal = build_plan_proposal(
            plan_id="lina-no-debt",
            tenant_id="personal-demo",
            workspace_kind="personal",
            purpose="no_debt_plan",
            horizon_steps=30,
            horizon_unit="day",
            data_quality="declared",
            proposed_actions=[
                {
                    "type": "own_funds_transfer",
                    "source_account_ref": "savings-demo",
                    "destination_account_ref": "current-demo",
                    "asset_id": "fiat:EUR",
                    "amount_decimal": "230.00",
                }
            ],
            evidence_refs=["lina-fixture-v1"],
        )
        with open(EXAMPLE_PATH, "r", encoding="utf-8") as fh:
            example = json.load(fh)
        self.assertEqual(proposal, example)

    def test_rejects_wrong_schema_version(self):
        bad = {
            "schema_version": "2.0",
            "plan_id": "x",
            "tenant_id": "y",
            "workspace_kind": "personal",
            "purpose": "no_debt_plan",
            "execution_mode": "proposal_only",
            "horizon": {"steps": 1, "unit": "day"},
            "data_quality": "declared",
            "proposed_actions": [{"type": "no_action"}],
            "evidence_refs": ["r"],
        }
        with self.assertRaises(ValueError):
            check_plan_proposal(bad)

    def test_rejects_own_funds_transfer_missing_amount(self):
        bad_action = {
            "type": "own_funds_transfer",
            "source_account_ref": "a",
            "destination_account_ref": "b",
            "asset_id": "fiat:EUR",
        }
        with self.assertRaises(ValueError):
            build_plan_proposal(
                plan_id="p",
                tenant_id="t",
                workspace_kind="personal",
                purpose="no_debt_plan",
                horizon_steps=1,
                horizon_unit="day",
                data_quality="declared",
                proposed_actions=[bad_action],
                evidence_refs=["r"],
            )


if __name__ == "__main__":
    unittest.main()
