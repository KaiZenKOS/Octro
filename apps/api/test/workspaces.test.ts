import { describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

function client() {
  return buildServer(buildDependencies());
}

describe("Octro API (S1)", () => {
  it("GET /health responds ok", async () => {
    const app = client();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("creates a personal workspace without organization_id (PER-03)", async () => {
    const app = client();
    const res = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: "22222222-2222-2222-2222-222222222222", kind: "personal", display_name: "Lina" },
    });
    expect(res.statusCode).toBe(201);
    const workspace = res.json();
    expect(workspace.organization_id).toBeUndefined();
  });

  it("rejects an organization workspace missing organization_id with 400", async () => {
    const app = client();
    const res = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: "22222222-2222-2222-2222-222222222222", kind: "organization", display_name: "Acme" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("denies a cross-tenant GET with 403 (SEC-01)", async () => {
    const app = client();
    const created = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: "22222222-2222-2222-2222-222222222222", kind: "personal", display_name: "Lina" },
    });
    const workspace = created.json();

    const res = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { "x-dev-tenant-id": "44444444-4444-4444-4444-444444444444" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("computes a projection reachable without any wallet/DID/KYC header (ACC-02, PER-11)", async () => {
    const app = client();
    const created = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      payload: { owner_user_id: "22222222-2222-2222-2222-222222222222", kind: "personal", display_name: "Lina" },
    });
    const workspace = created.json();

    const projectionRes = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { "x-dev-tenant-id": workspace.tenant_id },
      payload: {
        workspace_id: workspace.id,
        asset_id: "fiat:EUR",
        opening_balance: "650.00",
        horizon: { steps: 5, unit: "day" },
      },
    });
    expect(projectionRes.statusCode).toBe(200);
    expect(projectionRes.json().points).toHaveLength(5);
  });

  it("handles CORS preflight OPTIONS requests with Access-Control headers", async () => {
    const app = client();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/v1/projections",
      headers: {
        origin: "http://localhost:8081",
        "access-control-request-method": "POST",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
  });
});
