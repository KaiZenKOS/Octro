import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OctroMcpServer } from "@octro/mcp";
import { agentOpsService } from "../services/agent-ops.js";

function verifyAdminAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  // Env-gate ENABLE_ADMIN_DEBUG; default disabled
  if (process.env["ENABLE_ADMIN_DEBUG"] !== "true") {
    reply.code(404).send({
      code: "NOT_FOUND",
      message: "admin debug endpoints are disabled (ENABLE_ADMIN_DEBUG is not 'true')",
    });
    return false;
  }

  const expectedKey = process.env["ADMIN_INSIGHTS_KEY"] || "octro-admin-dev-secret";
  const providedKey = request.headers["x-admin-key"];

  if (typeof providedKey !== "string" || providedKey.trim() !== expectedKey) {
    reply.code(401).send({
      code: "UNAUTHORIZED",
      message: "unauthorized: valid x-admin-key header required",
    });
    return false;
  }

  return true;
}

// Routes d'administration et observabilité pour orchestrateur IA et MCP (AGT-01, AGT-02, MCP-02).
// Inactives par défaut : requiert ENABLE_ADMIN_DEBUG=true et header x-admin-key correspondant à ADMIN_INSIGHTS_KEY.
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const mcpServer = new OctroMcpServer();

  // 1) GET /v1/admin/agent/orchestration
  app.get("/v1/admin/agent/orchestration", async (request, reply) => {
    if (!verifyAdminAuth(request, reply)) return reply;

    const status = agentOpsService.getOrchestrationStatus();
    return reply.send(status);
  });

  const mcpHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!verifyAdminAuth(request, reply)) return reply;

    const tools = mcpServer.getTools();
    return reply.send({
      source: "@octro/mcp",
      count: tools.length,
      timestamp: new Date().toISOString(),
      tools,
    });
  };

  // 2) GET /v2/admin/mcp/tools (et alias /v1/admin/mcp/tools)
  app.get("/v2/admin/mcp/tools", mcpHandler);
  app.get("/v1/admin/mcp/tools", mcpHandler);
}
