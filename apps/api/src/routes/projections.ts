import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveTenant } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const ProjectionBody = z.object({
  workspace_id: z.string().uuid(),
  asset_id: z.string(),
  opening_balance: z.string(),
  horizon: z.object({ steps: z.number().int().min(1).max(366), unit: z.enum(["day", "hour"]) }),
});

// ACC-02, PER-11 : cette route ne consulte jamais NetworkCapabilitiesPort, ni
// Stripe, ni un wallet. La comparaison de financement (bloquee par NET-02)
// vit dans une route separee (approvals), jamais ici.
export async function projectionRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/projections", async (request, reply) => {
    try {
      const body = ProjectionBody.parse(request.body);
      const tenantId = await resolveTenant(request, reply, deps, body.workspace_id);
      if (!tenantId) return reply;
      const projection = await deps.getPersonalProjection.execute({
        requestingTenantId: tenantId,
        workspaceId: body.workspace_id,
        assetId: body.asset_id,
        openingBalance: body.opening_balance,
        horizon: body.horizon,
      });
      return reply.send(projection);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}

