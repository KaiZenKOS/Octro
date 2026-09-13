import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BoundedOrchestrator } from "@octro/agents";
import { sendError } from "../http-errors.js";
import { agentOpsService } from "../services/agent-ops.js";

const ExplainBody = z.object({
  workspace_id: z.string().min(1),
  current_balance_decimal: z.string(),
  horizon_days: z.number().int().min(1),
  deficit_amount_decimal: z.string().optional(),
  recommended_action: z.string().optional(),
  question: z.string().max(1000).optional(),
});

// AGT-01, AGT-02, MCP-02:
// Server-side bounded agent route. Keeps LLM API keys server-side (SEC-04).
// Deterministic fallback if keys are unset or network is unavailable.
// AGT-02: Explain-only, no signature or funds execution capabilities.
export async function agentRoutes(app: FastifyInstance): Promise<void> {
  const orchestrator = new BoundedOrchestrator();

  app.post("/v1/agent/explain", async (request, reply) => {
    const startTime = Date.now();
    const traceId = randomUUID();
    try {
      const body = ExplainBody.parse(request.body);
      const result = await orchestrator.explainCashflow(
        {
          workspaceId: body.workspace_id,
          currentBalanceDecimal: body.current_balance_decimal,
          horizonDays: body.horizon_days,
          ...(body.deficit_amount_decimal ? { deficitAmountDecimal: body.deficit_amount_decimal } : {}),
          ...(body.recommended_action ? { recommendedAction: body.recommended_action } : {}),
        },
        body.question,
      );
      const durationMs = Date.now() - startTime;
      agentOpsService.recordExecution({
        traceId,
        timestamp: new Date().toISOString(),
        workspaceId: body.workspace_id,
        requestShape: "explain_cashflow",
        callCount: result.callCount,
        callCountCap: 12,
        fallbackUsed: result.summary.includes("Analyse déterministe") || (!process.env["DEEPSEEK_API_KEY"] && !process.env["GEMINI_API_KEY"] && !process.env["OPENAI_API_KEY"]),
        durationMs,
        riskTag: body.deficit_amount_decimal && Number(body.deficit_amount_decimal) > 0 ? "deficit_detected" : "nominal",
      });
      return reply.send(result);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
