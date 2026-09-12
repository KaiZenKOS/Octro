import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession, resolveTenant } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const CreateWorkspaceBody = z.object({
  owner_user_id: z.string().uuid().optional(),
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
      let ownerUserId = body.owner_user_id;
      if (!ownerUserId) {
        const sessionUserId = await requireSession(request, reply, deps);
        if (!sessionUserId) return reply;
        ownerUserId = sessionUserId;
      }
      const workspace = await deps.createWorkspace.execute({
        ownerUserId,
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
    const { id } = request.params as { id: string };
    const tenantId = await resolveTenant(request, reply, deps, id);
    if (!tenantId) return reply;
    try {
      const workspace = await deps.getWorkspace.execute({ requestingTenantId: tenantId, workspaceId: id });
      return reply.send(workspace);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/workspaces/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = await resolveTenant(request, reply, deps, id);
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
