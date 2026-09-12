import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

const AS_OF = "2026-09-12T00:00:00.000Z";
const USER_ID = "22222222-2222-2222-2222-222222222222";

function client() {
  const deps = buildDependencies({ clock: { now: () => new Date(AS_OF) } });
  return { deps, app: buildServer(deps) };
}

async function createPersonalWorkspace(app: ReturnType<typeof buildServer>) {
  const created = await app.inject({
    method: "POST",
    url: "/v1/workspaces",
    payload: { owner_user_id: USER_ID, kind: "personal", display_name: "Lina" },
  });
  expect(created.statusCode).toBe(201);
  return created.json() as { id: string; tenant_id: string };
}

async function addEvent(app: ReturnType<typeof buildServer>, workspaceId: string, event: {
  direction: "inflow" | "outflow";
  amount_decimal: string;
  label: string;
  day: number;
}, idempotencyKey?: string) {
  return await app.inject({
    method: "POST",
    url: `/v1/workspaces/${workspaceId}/events`,
    headers: {
      "x-dev-tenant-id": workspaceId,
      ...(idempotencyKey !== undefined ? { "idempotency-key": idempotencyKey } : {}),
    },
    payload: {
      direction: event.direction,
      amount_decimal: event.amount_decimal,
      asset_id: "fiat:EUR",
      label: event.label,
      expected_settlement_at: `2026-09-${String(12 + event.day).padStart(2, "0")}T00:00:00Z`,
    },
  });
}

function projectionPayload(workspaceId: string) {
  return {
    workspace_id: workspaceId,
    asset_id: "fiat:EUR",
    opening_balances: { current: "650.00", savings: "300.00" },
    current_reserve: "100.00",
    savings_protected_reserve: "0.00",
    horizon: { steps: 30, unit: "day" },
  };
}

describe("Octro API vertical slice (ACC-01/02, PER-01/02/03/05/11, DATA-01/02/03, ENG-01/02, SEC-01/02, NET-02)", () => {
  it("creates a personal Workspace without an Organization (PER-03)", async () => {
    const { app } = client();
    const workspace = await createPersonalWorkspace(app);
    const fetched = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { "x-dev-tenant-id": workspace.tenant_id },
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().organization_id).toBeUndefined();
  });

  it("rejects an organization Workspace without organization_id (PER-03)", async () => {
    const { app } = client();
    const res = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: USER_ID, kind: "organization", display_name: "Acme" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("denies cross-tenant access (SEC-01)", async () => {
    const { app } = client();
    const workspace = await createPersonalWorkspace(app);
    const res = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { "x-dev-tenant-id": "44444444-4444-4444-8444-444444444444" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("runs Lina through the shared contract and Python engine, then returns INFEASIBLE with no action after +150 EUR", async () => {
    const { app } = client();
    const workspace = await createPersonalWorkspace(app);
    for (const [direction, amount_decimal, label, day] of [
      ["outflow", "600.00", "Loyer", 2],
      ["outflow", "100.00", "Courses", 4],
      ["outflow", "80.00", "Transport", 6],
      ["inflow", "1600.00", "Salaire", 10],
    ] as const) {
      const created = await addEvent(app, workspace.id, { direction, amount_decimal, label, day });
      expect(created.statusCode).toBe(201);
    }

    const first = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: projectionPayload(workspace.id),
    });
    expect(first.statusCode).toBe(200);
    const feasible = first.json();
    expect(feasible.status).toBe("FEASIBLE");
    expect(feasible.action_plan.proposed_actions).toEqual([{
      type: "own_funds_transfer",
      source_account_ref: "savings",
      destination_account_ref: "current",
      asset_id: "fiat:EUR",
      amount_decimal: "230.00",
    }]);
    expect(feasible.action_plan.plan_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(feasible.action_plan.version).toBe(1);
    expect(feasible.action_plan.proposed_projection.find((point: { t: number }) => point.t === 9)).toMatchObject({
      current_balance: "100.00",
      savings_balance: "70.00",
    });
    expect(feasible.action_plan.proposed_projection.find((point: { t: number }) => point.t === 10)).toMatchObject({
      current_balance: "1700.00",
      savings_balance: "70.00",
    });
    expect(feasible.projection.points.find((point: { t: number }) => point.t === 9)).toMatchObject({
      expected_balance: "-130.00",
      confirmed_balance: "650.00",
    });
    expect(feasible.provenance).toEqual({ source: "declared", as_of: AS_OF });

    const unchangedReplay = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: projectionPayload(workspace.id),
    });
    expect(unchangedReplay.json().action_plan.plan_hash).toBe(feasible.action_plan.plan_hash);

    const protectedSavings = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: { ...projectionPayload(workspace.id), savings_protected_reserve: "300.00" },
    });
    expect(protectedSavings.json().status).toBe("INFEASIBLE");
    expect(protectedSavings.json().diagnostic.proposed_actions).toEqual([]);
    expect(protectedSavings.json().diagnostic.deficit.amount_decimal).toBe("230.00");

    const unexpected = await addEvent(app, workspace.id, {
      direction: "outflow", amount_decimal: "150.00", label: "Imprévu", day: 8,
    });
    expect(unexpected.statusCode).toBe(201);
    const second = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: projectionPayload(workspace.id),
    });
    expect(second.statusCode).toBe(200);
    const infeasible = second.json();
    expect(infeasible.status).toBe("INFEASIBLE");
    expect(infeasible.action_plan).toBeUndefined();
    expect(infeasible.diagnostic.deficit).toEqual({ amount_decimal: "380.00", asset_id: "fiat:EUR" });
    expect(infeasible.diagnostic.proposed_actions).toEqual([]);
    expect(infeasible.diagnostic.plan_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(infeasible.diagnostic.plan_hash).not.toBe(feasible.action_plan.plan_hash);
  });

  it("forecasts without network/KYC/wallet capabilities while unknown capability blocks finance only (NET-02)", async () => {
    const configlessDeps = buildDependencies({
      clock: { now: () => new Date(AS_OF) },
      hackathonConfigPath: resolve(import.meta.dirname, "missing-hackathon.config.json"),
    });
    const deps = configlessDeps;
    const app = buildServer(deps);
    const workspace = await createPersonalWorkspace(app);
    const capabilities = await app.inject({ method: "GET", url: "/v1/network-capabilities" });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json().ledger_verified).toBe(false);

    const forecast = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: projectionPayload(workspace.id),
    });
    expect(forecast.statusCode).toBe(200);
    await expect(deps.approveFinancingAction.execute({
      requestingTenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      approverRole: "approver",
      capability: "lending_v1",
    })).rejects.toMatchObject({ name: "NetworkCapabilityUnavailableError" });
  });

  it("rejects float and unknown fields before optimization (DATA-03)", async () => {
    const { app } = client();
    const workspace = await createPersonalWorkspace(app);
    const floatAmount = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: { ...projectionPayload(workspace.id), opening_balances: { current: 650.0, savings: "300.00" } },
    });
    expect(floatAmount.statusCode).toBe(400);
    const unexpectedField = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: { ...projectionPayload(workspace.id), wallet_connected: true },
    });
    expect(unexpectedField.statusCode).toBe(400);
  });

  it("deduplicates a repeated event and conflicts when the same key has different content (DATA-01, SEC-02)", async () => {
    const { app } = client();
    const workspace = await createPersonalWorkspace(app);
    const event = { direction: "outflow" as const, amount_decimal: "600.00", label: "Loyer", day: 2 };
    const first = await addEvent(app, workspace.id, event, "rent-2026-09");
    const replay = await addEvent(app, workspace.id, event, "rent-2026-09");
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json().id).toBe(first.json().id);
    const conflict = await addEvent(app, workspace.id, { ...event, amount_decimal: "601.00" }, "rent-2026-09");
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().code).toBe("VERSION_CONFLICT");
  });

  it("handles CORS preflight OPTIONS requests", async () => {
    const { app } = client();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/v1/projections",
      headers: { origin: "http://localhost:8081", "access-control-request-method": "POST" },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
  });
});
