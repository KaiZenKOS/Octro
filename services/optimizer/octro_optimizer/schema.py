"""Build and check OctroActionPlanProposal objects (docs/v2.2/plan.schema.json).

execution_mode is always "proposal_only" (C1): this module never signs
or submits anything, it only shapes the engine's output into the
contract Kevin's UI and Samet's application layer already agreed on.
A hand-rolled check is used instead of the jsonschema package so the
optimizer keeps zero third-party dependencies (architecture.md).
"""
from typing import List

SCHEMA_VERSION = "2.1"
EXECUTION_MODE = "proposal_only"

_VALID_WORKSPACE_KINDS = {"personal", "organization"}
_VALID_PURPOSES = {"cashflow_forecast", "no_debt_plan", "financing_comparison"}
_VALID_DATA_QUALITY = {"declared", "imported", "provider_verified", "ledger_verified", "mixed"}
_VALID_ACTION_TYPES = {
    "no_action",
    "own_funds_transfer",
    "optional_expense_adjustment",
    "due_date_change_request",
    "financing_comparison",
}


def build_plan_proposal(
    plan_id: str,
    tenant_id: str,
    workspace_kind: str,
    purpose: str,
    horizon_steps: int,
    horizon_unit: str,
    data_quality: str,
    proposed_actions: List[dict],
    evidence_refs: List[str],
) -> dict:
    proposal = {
        "schema_version": SCHEMA_VERSION,
        "plan_id": plan_id,
        "tenant_id": tenant_id,
        "workspace_kind": workspace_kind,
        "purpose": purpose,
        "execution_mode": EXECUTION_MODE,
        "horizon": {"steps": horizon_steps, "unit": horizon_unit},
        "data_quality": data_quality,
        "proposed_actions": proposed_actions,
        "evidence_refs": evidence_refs,
    }
    check_plan_proposal(proposal)
    return proposal


def check_plan_proposal(proposal: dict) -> None:
    """Raise ValueError on the first violation of plan.schema.json."""
    if proposal.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("schema_version must be '2.1'")
    if not proposal.get("plan_id"):
        raise ValueError("plan_id is required")
    if not proposal.get("tenant_id"):
        raise ValueError("tenant_id is required")
    if proposal.get("workspace_kind") not in _VALID_WORKSPACE_KINDS:
        raise ValueError("workspace_kind must be personal or organization")
    if proposal.get("purpose") not in _VALID_PURPOSES:
        raise ValueError("purpose is not one of the allowed values")
    if proposal.get("execution_mode") != EXECUTION_MODE:
        raise ValueError("execution_mode must be 'proposal_only'")

    horizon = proposal.get("horizon") or {}
    steps = horizon.get("steps")
    if not isinstance(steps, int) or not (1 <= steps <= 366):
        raise ValueError("horizon.steps must be an integer in [1, 366]")
    if horizon.get("unit") not in {"day", "hour"}:
        raise ValueError("horizon.unit must be day or hour")

    if proposal.get("data_quality") not in _VALID_DATA_QUALITY:
        raise ValueError("data_quality is not one of the allowed values")

    evidence_refs = proposal.get("evidence_refs")
    if not evidence_refs or not isinstance(evidence_refs, list):
        raise ValueError("evidence_refs must be a non-empty array")

    actions = proposal.get("proposed_actions")
    if not actions or not isinstance(actions, list):
        raise ValueError("proposed_actions must be a non-empty array")
    for action in actions:
        action_type = action.get("type")
        if action_type not in _VALID_ACTION_TYPES:
            raise ValueError(f"unknown proposed_actions.type: {action_type!r}")
        if action_type == "own_funds_transfer":
            for required in (
                "source_account_ref",
                "destination_account_ref",
                "asset_id",
                "amount_decimal",
            ):
                if required not in action:
                    raise ValueError(f"own_funds_transfer missing field: {required}")
