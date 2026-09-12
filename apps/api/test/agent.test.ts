import { describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

describe("Octro API — Agent Explainer (AGT-01, AGT-02, MCP-02)", () => {
  it("POST /v1/agent/explain returns safe deterministic explanation without LLM keys", async () => {
    const app = buildServer(buildDependencies());
    const res = await app.inject({
      method: "POST",
      url: "/v1/agent/explain",
      payload: {
        workspace_id: "ws-personal-lina",
        current_balance_decimal: "650.00",
        horizon_days: 30,
        deficit_amount_decimal: "130.00",
        recommended_action: "own_funds_transfer: 230.00 EUR",
        question: "Pourquoi recommandez-vous un virement de 230 euros ?",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.isSafe).toBe(true);
    expect(body.callCount).toBeLessThanOrEqual(12);
    expect(body.summary).toContain("230");
    expect(body.riskExplanation).toContain("130");
  });
});
