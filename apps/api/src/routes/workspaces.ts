import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

// Placeholder d'authentification (S1). L'authentification reelle (OIDC/session,
// chapitre 19 du CDC) n'est pas construite dans ce lot : ce header porte
// deliberement un nom non ambigu pour ne jamais etre confondu avec une
// session verifiee, et sera remplace en meme temps que l'adaptateur S3/S5.
function requireTenantHeader(request: FastifyRequest, reply: FastifyReply): string | null {
  const value = request.headers["x-dev-tenant-id"];
  if (typeof value !== "string" || value.length === 0) {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "x-dev-tenant-id header required (placeholder auth, S1)" });
    return null;
  }
  return value;
}

const CreateWorkspaceBody = z.object({
  owner_user_id: z.string().uuid(),
  kind: z.enum(["personal", "organization"]),
  organization_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(120),
});

const RecordEventBody = z.object({
  direction: z.enum(["inflow", "outflow"]),
  amount_decimal: z.string(),
  asset_id: z.string(),
  label: z.string().min(1).max(200),
  expected_settlement_at: z.string().datetime({ offset: true }).optional(),
});

export async function workspaceRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/workspaces", async (request, reply) => {
    try {
      const body = CreateWorkspaceBody.parse(request.body);
      const workspace = await deps.createWorkspace.execute({
        ownerUserId: body.owner_user_id,
        kind: body.kind,
        displayName: body.display_name,
        ...(body.organization_id !== undefined ? { organizationId: body.organization_id } : {}),
      });
      return reply.code(201).send(workspace);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/workspaces/:id", async (request, reply) => {
    const tenantId = requireTenantHeader(request, reply);
    if (!tenantId) return reply;
    try {
      const { id } = request.params as { id: string };
      const workspace = await deps.getWorkspace.execute({ requestingTenantId: tenantId, workspaceId: id });
      return reply.send(workspace);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/workspaces/:id/events", async (request, reply) => {
    const tenantId = requireTenantHeader(request, reply);
    if (!tenantId) return reply;
    try {
      const { id } = request.params as { id: string };
      const body = RecordEventBody.parse(request.body);
      const event = await deps.recordDeclaredEvent.execute({
        requestingTenantId: tenantId,
        workspaceId: id,
        direction: body.direction,
        amountDecimal: body.amount_decimal,
        assetId: body.asset_id,
        label: body.label,
        ...(body.expected_settlement_at !== undefined
          ? { expectedSettlementAt: body.expected_settlement_at }
          : {}),
      });
      return reply.code(201).send(event);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
