import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ProjectionRequestSchema } from "@octro/contracts";
import type { AppDependencies } from "../composition.js";
import { requireWorkspaceOwner } from "../auth.js";
import { sendError } from "../http-errors.js";

// ACC-02/PER-11/NET-02: baseline forecasting never reads network capabilities,
// wallet connection or KYC state. The shared schema rejects floats and extra
// fields before the application calls the Python optimizer port.
export async function projectionRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const handleProjection = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ProjectionRequestSchema.parse(request.body);
      const access = await requireWorkspaceOwner(request, reply, deps, body.workspace_id);
      if (!access) return reply;
      const result = await deps.getPersonalProjection.execute({
        requestingTenantId: access.workspace.tenant_id,
        workspaceId: access.workspace.id,
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
