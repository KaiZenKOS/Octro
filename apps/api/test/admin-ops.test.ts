import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";
import { agentOpsService } from "../src/services/agent-ops.js";

describe("Admin Ops & Observability API (AGT-01, AGT-02, MCP-02, SEC-04)", () => {
  const adminKey = "octro-admin-dev-secret";

  beforeEach(() => {
    process.env["ENABLE_ADMIN_DEBUG"] = "true";
    process.env["ADMIN_INSIGHTS_KEY"] = adminKey;
    agentOpsService.clearHistory();
  });

  afterEach(() => {
    delete process.env["ENABLE_ADMIN_DEBUG"];
    delete process.env["ADMIN_INSIGHTS_KEY"];
    agentOpsService.clearHistory();
  });

  it("disables admin routes by default when ENABLE_ADMIN_DEBUG is unset (404)", async () => {
    delete process.env["ENABLE_ADMIN_DEBUG"];
    const app = buildServer(buildDependencies());

    const orchRes = await app.inject({
      method: "GET",
      url: "/v1/admin/agent/orchestration",
      headers: { "x-admin-key": adminKey },
    });
    expect(orchRes.statusCode).toBe(404);

    const mcpRes = await app.inject({
      method: "GET",
      url: "/v2/admin/mcp/tools",
      headers: { "x-admin-key": adminKey },
    });
    expect(mcpRes.statusCode).toBe(404);
  });

  it("rejects unauthorized access without x-admin-key (401)", async () => {
    const app = buildServer(buildDependencies());

    const orchRes = await app.inject({
      method: "GET",
      url: "/v1/admin/agent/orchestration",
    });
    expect(orchRes.statusCode).toBe(401);
    expect(orchRes.json()).toEqual({
      code: "UNAUTHORIZED",
      message: "unauthorized: valid x-admin-key header required",
    });

    const mcpRes = await app.inject({
      method: "GET",
      url: "/v2/admin/mcp/tools",
    });
    expect(mcpRes.statusCode).toBe(401);
  });

  it("rejects invalid x-admin-key (401)", async () => {
    const app = buildServer(buildDependencies());

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/agent/orchestration",
      headers: { "x-admin-key": "wrong-secret-key" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns orchestrator observability status with valid key (200, SEC-04)", async () => {
    const app = buildServer(buildDependencies());

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/agent/orchestration",
      headers: { "x-admin-key": adminKey },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.orchestratorVersion).toBe("2.2.0");
    expect(body.policy).toEqual({
      maxToolCalls: 12,
      policyTimeoutMs: 15000,
      budget: "bounded",
    });
    expect(["live", "deterministic"]).toContain(body.providerMode);
    expect(Array.isArray(body.dernieres_executions)).toBe(true);

    // SEC-04: Ensure no API keys or secrets are leaked anywhere in the JSON response
    const jsonString = JSON.stringify(body);
    expect(jsonString).not.toContain("sk-");
    expect(jsonString).not.toContain("AIzaSy");
  });

  it("records AI execution in RAM ring buffer upon explain request", async () => {
    const app = buildServer(buildDependencies());

    // 1. Invoke explain route
    const explainRes = await app.inject({
      method: "POST",
      url: "/v1/agent/explain",
      payload: {
        workspace_id: "ws-test-observability",
        current_balance_decimal: "1000.00",
        horizon_days: 14,
        deficit_amount_decimal: "250.00",
        recommended_action: "own_funds_transfer: 250.00 EUR",
        question: "Expliquez le risque de déficit.",
      },
    });
    expect(explainRes.statusCode).toBe(200);

    // 2. Fetch admin orchestration status
    const adminRes = await app.inject({
      method: "GET",
      url: "/v1/admin/agent/orchestration",
      headers: { "x-admin-key": adminKey },
    });
    expect(adminRes.statusCode).toBe(200);
    const status = adminRes.json();

    expect(status.dernieres_executions).toHaveLength(1);
    const item = status.dernieres_executions[0];
    expect(item.workspaceId).toBe("ws-test-observability");
    expect(item.requestShape).toBe("explain_cashflow");
    expect(item.callCount).toBeGreaterThan(0);
    expect(item.callCountCap).toBe(12);
    expect(item.durationMs).toBeGreaterThanOrEqual(0);
    expect(item.riskTag).toBe("deficit_detected");
    expect(item.traceId).toBeDefined();
  });

  it("exposes MCP tools list on GET /v2/admin/mcp/tools and /v1/admin/mcp/tools", async () => {
    const app = buildServer(buildDependencies());

    for (const url of ["/v2/admin/mcp/tools", "/v1/admin/mcp/tools"]) {
      const res = await app.inject({
        method: "GET",
        url,
        headers: { "x-admin-key": adminKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.source).toBe("@octro/mcp");
      expect(body.count).toBe(3);
      expect(body.tools).toHaveLength(3);

      const toolNames = body.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain("octro_get_workspace_summary");
      expect(toolNames).toContain("octro_get_projection");
      expect(toolNames).toContain("octro_explain_proposal");

      for (const tool of body.tools) {
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(tool.parameters).toBeDefined();
      }
    }
  });
});
