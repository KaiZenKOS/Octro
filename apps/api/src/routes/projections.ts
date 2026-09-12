import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ProjectionRequestSchema, TenantIdSchema } from "@octro/contracts";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

function requireTenantHeader(request: FastifyRequest, reply: FastifyReply): string | null {
  const parsed = TenantIdSchema.safeParse(request.headers["x-dev-tenant-id"]);
  if (!parsed.success) {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "x-dev-tenant-id header required (placeholder auth)" });
    return null;
  }
  return parsed.data;
}

// ACC-02/PER-11/NET-02: baseline forecasting never reads network capabilities,
// wallet connection or KYC state. The shared schema rejects floats and extra
// fields before the application calls the Python optimizer port.
export async function projectionRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const handleProjection = async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantHeader(request, reply);
    if (!tenantId) return reply;
    try {
      const body = ProjectionRequestSchema.parse(request.body);
      const result = await deps.getPersonalProjection.execute({
        requestingTenantId: tenantId,
        workspaceId: body.workspace_id,
        assetId: body.asset_id,
        openingBalances: body.opening_balances,
        currentReserve: body.current_reserve,
        savingsProtectedReserve: body.savings_protected_reserve,
        horizon: body.horizon,
      });
      return reply.send(result);
    } catch (err) {
      return sendError(reply, err);
    }
  };

  app.post("/v1/projections", handleProjection);
  app.post("/v1/forecasts", handleProjection);
}
