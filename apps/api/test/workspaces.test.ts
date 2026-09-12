import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { RecordingMailAdapter } from "@octro/application";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

const AS_OF = "2026-09-12T00:00:00.000Z";
const USER_ID = "22222222-2222-2222-2222-222222222222";

function client() {
  const deps = buildDependencies({ clock: { now: () => new Date(AS_OF) } });
  return { deps, app: buildServer(deps) };
}

function extractCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match) throw new Error("verification code was not sent");
  return match[1]!;
}

async function authenticate(app: ReturnType<typeof buildServer>, deps: ReturnType<typeof buildDependencies>, email: string) {
  const password = "correct horse battery staple";
  const signup = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: { email, password } });
  expect(signup.statusCode).toBe(201);
  const userId = signup.json().id as string;
  const code = extractCode((deps.mail as RecordingMailAdapter).last!.text);
  const verify = await app.inject({ method: "POST", url: "/v1/auth/verify-email", payload: { user_id: userId, code } });
  expect(verify.statusCode).toBe(200);
  const login = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email, password } });
  expect(login.statusCode).toBe(200);
  return { userId, token: login.json().token as string };
}

async function createPersonalWorkspace(app: ReturnType<typeof buildServer>, token: string) {
  const created = await app.inject({
    method: "POST",
    url: "/v1/workspaces",
    headers: { authorization: `Bearer ${token}` },
    payload: { kind: "personal", display_name: "Lina" },
  });
  expect(created.statusCode).toBe(201);
  return created.json() as { id: string; tenant_id: string };
}

async function addEvent(app: ReturnType<typeof buildServer>, workspaceId: string, token: string, event: {
  direction: "inflow" | "outflow";
  amount_decimal: string;
  label: string;
  day: number;
}, idempotencyKey?: string) {
  return await app.inject({
    method: "POST",
    url: `/v1/workspaces/${workspaceId}/events`,
    headers: {
      authorization: `Bearer ${token}`,
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
    const { app, deps } = client();
    const { token } = await authenticate(app, deps, "workspace-owner@example.com");
    const workspace = await createPersonalWorkspace(app, token);
    const fetched = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().organization_id).toBeUndefined();
  });

  it("rejects an organization Workspace without organization_id (PER-03)", async () => {
    const { app, deps } = client();
    const { token } = await authenticate(app, deps, "workspace-org-invalid@example.com");
    const res = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: "organization", display_name: "Acme" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("denies cross-tenant access (SEC-01)", async () => {
    const { app, deps } = client();
    const owner = await authenticate(app, deps, "workspace-owner-sec@example.com");
    const intruder = await authenticate(app, deps, "workspace-intruder@example.com");
    const workspace = await createPersonalWorkspace(app, owner.token);
    const res = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { authorization: `Bearer ${intruder.token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("denies cross-owner event writes and projections even when the caller supplies the resource ID (SEC-01)", async () => {
    const { app, deps } = client();
    const owner = await authenticate(app, deps, "workspace-owner-write@example.com");
    const intruder = await authenticate(app, deps, "workspace-intruder-write@example.com");
    const workspace = await createPersonalWorkspace(app, owner.token);

    const event = await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace.id}/events`,
      headers: { authorization: `Bearer ${intruder.token}` },
      payload: {
        direction: "outflow",
        amount_decimal: "20.00",
        asset_id: "fiat:EUR",
        label: "Not mine",
      },
    });
    expect(event.statusCode).toBe(404);

    const projection = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${intruder.token}` },
      payload: projectionPayload(workspace.id),
    });
    expect(projection.statusCode).toBe(404);
  });

  it("runs Lina through the shared contract and Python engine, then returns INFEASIBLE with no action after +150 EUR", async () => {
    const { app, deps } = client();
    const { token } = await authenticate(app, deps, "workspace-projection@example.com");
    const workspace = await createPersonalWorkspace(app, token);
    for (const [direction, amount_decimal, label, day] of [
      ["outflow", "600.00", "Loyer", 2],
      ["outflow", "100.00", "Courses", 4],
      ["outflow", "80.00", "Transport", 6],
      ["inflow", "1600.00", "Salaire", 10],
    ] as const) {
      const created = await addEvent(app, workspace.id, token, { direction, amount_decimal, label, day });
      expect(created.statusCode).toBe(201);
    }

    const first = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
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
      headers: { authorization: `Bearer ${token}` },
      payload: projectionPayload(workspace.id),
    });
    expect(unchangedReplay.json().action_plan.plan_hash).toBe(feasible.action_plan.plan_hash);

    const protectedSavings = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...projectionPayload(workspace.id), savings_protected_reserve: "300.00" },
    });
    expect(protectedSavings.json().status).toBe("INFEASIBLE");
    expect(protectedSavings.json().diagnostic.proposed_actions).toEqual([]);
    expect(protectedSavings.json().diagnostic.deficit.amount_decimal).toBe("230.00");

    const unexpected = await addEvent(app, workspace.id, token, {
      direction: "outflow", amount_decimal: "150.00", label: "Imprévu", day: 8,
    });
    expect(unexpected.statusCode).toBe(201);
    const second = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
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
    const { token } = await authenticate(app, deps, "workspace-offline@example.com");
    const workspace = await createPersonalWorkspace(app, token);
    const capabilities = await app.inject({ method: "GET", url: "/v1/network-capabilities" });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json().ledger_verified).toBe(false);

    const forecast = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
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
    const { app, deps } = client();
    const { token } = await authenticate(app, deps, "workspace-validation@example.com");
    const workspace = await createPersonalWorkspace(app, token);
    const floatAmount = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...projectionPayload(workspace.id), opening_balances: { current: 650.0, savings: "300.00" } },
    });
    expect(floatAmount.statusCode).toBe(400);
    const unexpectedField = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...projectionPayload(workspace.id), wallet_connected: true },
    });
    expect(unexpectedField.statusCode).toBe(400);
  });

  it("deduplicates a repeated event and conflicts when the same key has different content (DATA-01, SEC-02)", async () => {
    const { app, deps } = client();
    const { token } = await authenticate(app, deps, "workspace-events@example.com");
    const workspace = await createPersonalWorkspace(app, token);
    const event = { direction: "outflow" as const, amount_decimal: "600.00", label: "Loyer", day: 2 };
    const first = await addEvent(app, workspace.id, token, event, "rent-2026-09");
    const replay = await addEvent(app, workspace.id, token, event, "rent-2026-09");
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json().id).toBe(first.json().id);
    const conflict = await addEvent(app, workspace.id, token, { ...event, amount_decimal: "601.00" }, "rent-2026-09");
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

  it("requires a verified session and derives workspace ownership from it (SEC-01, ACC-01)", async () => {
    const { app, deps } = client();
    const user = await authenticate(app, deps, "workspace-session@example.com");
    const unauthenticatedCreate = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: USER_ID, kind: "personal", display_name: "Spoofed" },
    });
    expect(unauthenticatedCreate.statusCode).toBe(401);

    const spoofedOwner = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { owner_user_id: USER_ID, kind: "personal", display_name: "Spoofed" },
    });
    expect(spoofedOwner.statusCode).toBe(400);

    const created = await createPersonalWorkspace(app, user.token);
    const persisted = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${user.token}` },
    });
    expect(persisted.json().owner_user_id).toBe(user.userId);

    const headerOnlyForecast = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": created.id },
      payload: projectionPayload(created.id),
    });
    expect(headerOnlyForecast.statusCode).toBe(401);
  });
});
