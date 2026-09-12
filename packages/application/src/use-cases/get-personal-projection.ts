import { createHash, randomUUID } from "node:crypto";
import {
  ActionPlanSchema,
  PersonalOptimizerInputSchema,
  ProjectionResultSchema,
  ProjectionSchema,
  type ActionPlan,
  type Horizon,
  type Projection,
  type ProjectionResult,
  type Verification,
} from "@octro/contracts";
import { assertSameTenant } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { EconomicEventRepository } from "../ports/economic-event-repository.js";
import type { OptimizerPort } from "../ports/optimizer-port.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";

export interface GetPersonalProjectionQuery {
  requestingTenantId: string;
  workspaceId: string;
  assetId: string;
  openingBalances: { current: string; savings: string };
  currentReserve: string;
  savingsProtectedReserve: string;
  horizon: Horizon;
  /** Internal trusted fixture marker; never taken from the HTTP request. */
  fixtureId?: string;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function dataQuality(events: Awaited<ReturnType<EconomicEventRepository["listByTenant"]>>): Verification | "mixed" {
  const qualities = new Set(events.filter((event) => event.status !== "cancelled").map((event) => event.verification));
  if (qualities.size === 0) return "declared";
  return qualities.size === 1 ? [...qualities][0]! : "mixed";
}

// ACC-02, PER-11 and NET-02: personal projections call only the optimizer
// port. Wallet, KYC and network capabilities are irrelevant to forecasting.
// The application shapes and hashes the immutable plan but performs no
// financial arithmetic; the Python engine supplies every balance and action.
export class GetPersonalProjectionUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly events: EconomicEventRepository,
    private readonly optimizer: OptimizerPort,
    private readonly clock: Clock,
  ) {}

  async execute(query: GetPersonalProjectionQuery): Promise<ProjectionResult> {
    const workspace = await this.workspaces.findById(query.workspaceId);
    if (!workspace) throw new NotFoundError("Workspace", query.workspaceId);
    assertSameTenant(query.requestingTenantId, workspace.tenant_id);

    const events = await this.events.listByTenant(workspace.tenant_id);
    const asOf = this.clock.now().toISOString();
    const optimizerInput = PersonalOptimizerInputSchema.parse({
      workspace_id: workspace.id,
      tenant_id: workspace.tenant_id,
      asset_id: query.assetId,
      opening_balances: query.openingBalances,
      current_reserve: query.currentReserve,
      savings_protected_reserve: query.savingsProtectedReserve,
      horizon: query.horizon,
      as_of: asOf,
      events,
    });
    const optimized = await this.optimizer.optimizePersonal(optimizerInput);
    const quality = dataQuality(events);

    const projection: Projection = ProjectionSchema.parse({
      id: randomUUID(),
      tenant_id: workspace.tenant_id,
      generated_at: asOf,
      as_of: asOf,
      horizon: query.horizon,
      data_quality: quality,
      points: optimized.trace.map((point) => ({
        t: point.t,
        asset_id: query.assetId,
        expected_balance: point.expected_balance_decimal,
        confirmed_balance: point.confirmed_balance_decimal,
      })),
    });

    const planVersion = 1;
    const commonPlanMaterial = {
      tenant_id: workspace.tenant_id,
      version: planVersion,
      purpose: "no_debt_plan",
      data_quality: quality,
      snapshot: optimizerInput,
      optimizer_version: optimized.engine_version,
      result: optimized,
    };
    const planHash = createHash("sha256").update(canonicalize(commonPlanMaterial)).digest("hex");
    const provenance = {
      source: query.fixtureId === undefined ? "declared" : "synthetic",
      ...(query.fixtureId !== undefined ? { fixture_id: query.fixtureId } : {}),
      as_of: asOf,
    } as const;

    if (optimized.status === "FEASIBLE") {
      const actionPlan: ActionPlan = ActionPlanSchema.parse({
        id: randomUUID(),
        tenant_id: workspace.tenant_id,
        version: planVersion,
        purpose: "no_debt_plan",
        status: "PROPOSED",
        data_quality: quality,
        proposed_actions: optimized.proposed_actions,
        proposed_projection: optimized.action_trace.map((point) => ({
          t: point.t,
          asset_id: query.assetId,
          current_balance: point.current_balance_decimal,
          savings_balance: point.savings_balance_decimal,
        })),
        plan_hash: planHash,
        created_at: asOf,
      });
      return ProjectionResultSchema.parse({
        status: "FEASIBLE",
        projection,
        action_plan: actionPlan,
        provenance,
      });
    }

    return ProjectionResultSchema.parse({
      status: "INFEASIBLE",
      projection,
      diagnostic: {
        id: randomUUID(),
        tenant_id: workspace.tenant_id,
        version: planVersion,
        status: "INFEASIBLE",
        code: "INFEASIBLE",
        purpose: "no_debt_plan",
        deficit: {
          amount_decimal: optimized.diagnostic.deficit_decimal,
          asset_id: query.assetId,
        },
        binding_constraints: optimized.diagnostic.binding_constraints,
        reason: optimized.diagnostic.reason,
        proposed_actions: [],
        plan_hash: planHash,
        created_at: asOf,
      },
      provenance,
    });
  }
}
