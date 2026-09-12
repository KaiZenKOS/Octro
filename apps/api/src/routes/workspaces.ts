import type { FastifyInstance } from "fastify";
import { DeclaredEventRequestSchema, IdSchema } from "@octro/contracts";
import { z } from "zod";
import type { AppDependencies } from "../composition.js";
import { requireSession, requireWorkspaceOwner } from "../auth.js";
import { sendError } from "../http-errors.js";

const CreateWorkspaceBody = z.object({
  kind: z.enum(["personal", "organization"]),
  organization_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(120),
}).strict();

export async function workspaceRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/workspaces", async (request, reply) => {
    try {
      const userId = await requireSession(request, reply, deps);
      if (!userId) return reply;
      const body = CreateWorkspaceBody.parse(request.body);
      const workspace = await deps.createWorkspace.execute({
        ownerUserId: userId,
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
    try {
      const { id: rawId } = request.params as { id: string };
      const id = IdSchema.parse(rawId);
      const access = await requireWorkspaceOwner(request, reply, deps, id);
      if (!access) return reply;
      return reply.send(access.workspace);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/workspaces/:id/events", async (request, reply) => {
    try {
      const { id: rawId } = request.params as { id: string };
      const id = IdSchema.parse(rawId);
      const access = await requireWorkspaceOwner(request, reply, deps, id);
      if (!access) return reply;
      const body = DeclaredEventRequestSchema.parse(request.body);
      const idempotencyKey = request.headers["idempotency-key"];
      if (idempotencyKey !== undefined && (typeof idempotencyKey !== "string" || idempotencyKey.length > 200)) {
        return reply.code(400).send({ code: "INVALID_REQUEST", message: "Idempotency-Key must be a string of at most 200 characters" });
      }
      const event = await deps.recordDeclaredEvent.execute({
        requestingTenantId: access.workspace.tenant_id,
        workspaceId: access.workspace.id,
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
