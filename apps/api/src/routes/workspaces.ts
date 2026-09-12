import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DeclaredEventRequestSchema, IdSchema, TenantIdSchema } from "@octro/contracts";
import { z } from "zod";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

// Placeholder d'authentification (S1). L'authentification reelle (OIDC/session,
// chapitre 19 du CDC) n'est pas construite dans ce lot : ce header porte
// deliberement un nom non ambigu pour ne jamais etre confondu avec une
// session verifiee, et sera remplace en meme temps que l'adaptateur S3/S5.
function requireTenantHeader(request: FastifyRequest, reply: FastifyReply): string | null {
  const parsed = TenantIdSchema.safeParse(request.headers["x-dev-tenant-id"]);
  if (!parsed.success) {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "x-dev-tenant-id header required (placeholder auth, S1)" });
    return null;
  }
  return parsed.data;
}

const CreateWorkspaceBody = z.object({
  owner_user_id: z.string().uuid(),
  kind: z.enum(["personal", "organization"]),
  organization_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(120),
}).strict();

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
      const { id: rawId } = request.params as { id: string };
      const id = IdSchema.parse(rawId);
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
      const { id: rawId } = request.params as { id: string };
      const id = IdSchema.parse(rawId);
      const body = DeclaredEventRequestSchema.parse(request.body);
      const idempotencyKey = request.headers["idempotency-key"];
      if (idempotencyKey !== undefined && (typeof idempotencyKey !== "string" || idempotencyKey.length > 200)) {
        return reply.code(400).send({ code: "INVALID_REQUEST", message: "Idempotency-Key must be a string of at most 200 characters" });
      }
      const event = await deps.recordDeclaredEvent.execute({
        requestingTenantId: tenantId,
        workspaceId: id,
        direction: body.direction,
        amountDecimal: body.amount_decimal,
        assetId: body.asset_id,
        label: body.label,
        ...(idempotencyKey !== undefined ? { sourceEventId: idempotencyKey } : {}),
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
