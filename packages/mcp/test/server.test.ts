import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ActionPlan, Projection, ProjectionResult, Workspace } from "@octro/contracts";
import { OctroMcpServer, type McpCallResult, type McpRequestContext, type OctroMcpUseCases } from "../src/index.js";

const tenantId = randomUUID();
const workspaceId = tenantId;
const actorId = randomUUID();
const planId = randomUUID();
const requestId = randomUUID();
const otherTenantId = randomUUID();

const workspace: Workspace = {
  id: workspaceId,
  tenant_id: tenantId,
  kind: "personal",
  owner_user_id: actorId,
  display_name: "Espace personnel",
  created_at: "2026-09-12T10:00:00.000Z",
};

const projection: Projection = {
  id: randomUUID(),
  tenant_id: tenantId,
  generated_at: "2026-09-12T10:00:00.000Z",
  as_of: "2026-09-12T10:00:00.000Z",
  horizon: { steps: 30, unit: "day" },
  data_quality: "declared",
  points: [{ t: 0, asset_id: "fiat:EUR", expected_balance: "42.00", confirmed_balance: "42.00" }],
};

const actionPlan: ActionPlan = {
  id: planId,
  tenant_id: tenantId,
  version: 1,
  purpose: "no_debt_plan",
  status: "PROPOSED",
  data_quality: "declared",
  proposed_actions: [{
    type: "own_funds_transfer",
    source_account_ref: "savings-01",
    destination_account_ref: "current-01",
    asset_id: "fiat:EUR",
    amount_decimal: "42.00",
  }],
  proposed_projection: [{ t: 0, asset_id: "fiat:EUR", current_balance: "100.00", savings_balance: "242.00" }],
  plan_hash: "a".repeat(64),
  created_at: "2026-09-12T10:00:00.000Z",
};
const projectionResult: ProjectionResult = {
  status: "FEASIBLE",
  projection,
  action_plan: actionPlan,
  provenance: { source: "declared", as_of: "2026-09-12T10:00:00.000Z" },
};

const requestContext: McpRequestContext = {
  effectiveTenantId: tenantId,
  actorId,
  scopes: ["data:read", "engine:forecast", "plans:read"],
  traceId: "trace-1",
};

function useCases(overrides: Partial<OctroMcpUseCases> = {}, observed: Record<string, unknown> = {}): OctroMcpUseCases {
  return {
    async getWorkspace(input) { observed.workspace = input; return workspace; },
    async getProjection(input) {
      observed.projection = input;
      return projectionResult;
    },
    async getActionPlan(input) { observed.plan = input; return actionPlan; },
    ...overrides,
  };
}

function parseResult(result: McpCallResult): unknown {
  return JSON.parse(result.content[0]?.text ?? "{}");
}

describe("OctroMcpServer (MCP-02, SEC-01, UI-02)", () => {
  it("exposes only scoped, read-only application tools", () => {
    const server = new OctroMcpServer(useCases());
    const names = server.getTools().map((tool) => tool.name);

    expect(names).toEqual(["octro_get_workspace_summary", "octro_get_projection", "octro_get_action_plan"]);
    expect(names.some((name) => /sign|submit|xrpl|prepare/i.test(name))).toBe(false);
    expect(server.getTools().every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true);
  });

  it("derives the tenant from trusted request context, never from tool arguments", async () => {
    const observed: Record<string, unknown> = {};
    const server = new OctroMcpServer(useCases({}, observed));
    const args = { requestId, workspaceId, expectedVersion: 1 };
    const success = await server.callTool("octro_get_workspace_summary", args, requestContext);
    const denied = await server.callTool("octro_get_workspace_summary", { ...args, tenantId: otherTenantId }, requestContext);

    expect(success.isError).toBeUndefined();
    expect((observed.workspace as { requestingTenantId: string }).requestingTenantId).toBe(tenantId);
    expect(denied.isError).toBe(true);
    expect(parseResult(denied)).toMatchObject({ code: "INVALID_ARGUMENTS" });
  });

  it("checks the returned workspace and projection remain in the authenticated tenant", async () => {
    const foreignWorkspace = { ...workspace, id: otherTenantId, tenant_id: otherTenantId };
    const foreignProjection: ProjectionResult = {
      ...projectionResult,
      projection: { ...projection, tenant_id: otherTenantId },
      action_plan: { ...actionPlan, tenant_id: otherTenantId },
    };
    const server = new OctroMcpServer(useCases({
      async getWorkspace() { return foreignWorkspace; },
      async getProjection() { return foreignProjection; },
    }));
    const args = { requestId, workspaceId, expectedVersion: 1 };

    const workspaceResult = await server.callTool("octro_get_workspace_summary", args, requestContext);
    const projectionCall = await server.callTool("octro_get_projection", args, requestContext);
    expect(parseResult(workspaceResult)).toMatchObject({ code: "TENANT_ISOLATION_DENIED" });
    expect(parseResult(projectionCall)).toMatchObject({ code: "TENANT_ISOLATION_DENIED" });
  });

  it("delegates projection reads using references only and preserves the discriminated result", async () => {
    const observed: Record<string, unknown> = {};
    const server = new OctroMcpServer(useCases({}, observed));
    const response = await server.callTool("octro_get_projection", { requestId, workspaceId, expectedVersion: 1 }, requestContext);
    const parsed = parseResult(response) as { status: string; action_plan?: { proposed_actions: Array<{ amount_decimal: string }> } };

    expect(response.isError).toBeUndefined();
    expect((observed.projection as Record<string, unknown>).requestingTenantId).toBe(tenantId);
    expect(parsed.status).toBe("FEASIBLE");
    expect(parsed.action_plan?.proposed_actions[0]?.amount_decimal).toBe("42.00");
  });

  it("requires scopes and rejects unverified/malformed request contexts", async () => {
    const server = new OctroMcpServer(useCases());
    const args = { requestId, workspaceId, expectedVersion: 1 };
    const missingScope = await server.callTool("octro_get_projection", args, { ...requestContext, scopes: ["data:read"] });
    const badContext = await server.callTool("octro_get_projection", args, { ...requestContext, effectiveTenantId: "attacker" });

    expect(parseResult(missingScope)).toMatchObject({ code: "SCOPE_REQUIRED" });
    expect(parseResult(badContext)).toMatchObject({ code: "UNAUTHENTICATED_CONTEXT" });
  });

  it("requires a plan reference and version, then returns the application ActionPlan unchanged", async () => {
    const observed: Record<string, unknown> = {};
    const server = new OctroMcpServer(useCases({}, observed));
    const response = await server.callTool("octro_get_action_plan", { requestId, workspaceId, planId, expectedVersion: 1 }, requestContext);
    const parsed = parseResult(response) as ActionPlan;
    const missingVersion = await server.callTool("octro_get_action_plan", { requestId, workspaceId, planId }, requestContext);

    expect(response.isError).toBeUndefined();
    expect((observed.plan as { requestingTenantId: string; planId: string }).requestingTenantId).toBe(tenantId);
    expect(parsed.plan_hash).toBe(actionPlan.plan_hash);
    expect(parseResult(missingVersion)).toMatchObject({ code: "INVALID_ARGUMENTS" });
  });

  it("does not leak application error details", async () => {
    const server = new OctroMcpServer(useCases({
      async getWorkspace() { throw new Error("private database host and tenant records"); },
    }));
    const response = await server.callTool("octro_get_workspace_summary", { requestId, workspaceId, expectedVersion: 1 }, requestContext);

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).not.toContain("private database host");
    expect(parseResult(response)).toMatchObject({ code: "WORKSPACE_UNAVAILABLE" });
  });

  it("rejects unknown tools", async () => {
    const server = new OctroMcpServer(useCases());
    const response = await server.callTool("xrpl_submit", {}, requestContext);
    const signResponse = await server.callTool("xrpl_sign", {}, requestContext);
    expect(parseResult(response)).toMatchObject({ code: "UNKNOWN_TOOL" });
    expect(parseResult(signResponse)).toMatchObject({ code: "UNKNOWN_TOOL" });
  });
});
