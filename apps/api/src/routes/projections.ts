import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

function requireTenantHeader(request: FastifyRequest, reply: FastifyReply): string | null {
  const value = request.headers["x-dev-tenant-id"];
  if (typeof value !== "string" || value.length === 0) {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "x-dev-tenant-id header required (placeholder auth, S1)" });
    return null;
  }
  return value;
}

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
    const tenantId = requireTenantHeader(request, reply);
    if (!tenantId) return reply;
    try {
      const body = ProjectionBody.parse(request.body);
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
