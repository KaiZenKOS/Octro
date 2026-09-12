import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppDependencies } from "./composition.js";

// Authentification reelle (Phase A), remplace le placeholder x-dev-tenant-id
// pour toutes les routes ajoutees a partir de cette phase (auth/kyc/credit/
// lending). Les routes existantes (workspaces/projections) restent sur le
// placeholder x-dev-tenant-id — hors perimetre de ce changement.
export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: AppDependencies,
): Promise<string | null> {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authorization: Bearer <token> header required" });
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const { userId } = await deps.validateSession.execute({ token });
    return userId;
  } catch {
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "session invalid or expired" });
    return null;
  }
}

export async function resolveTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: AppDependencies,
  workspaceId?: string,
): Promise<string | null> {
  const header = request.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    let userId: string;
    try {
      const session = await deps.validateSession.execute({ token });
      userId = session.userId;
    } catch {
      reply.code(401).send({ code: "UNAUTHENTICATED", message: "session invalid or expired" });
      return null;
    }

    if (workspaceId) {
      try {
        const workspace = await deps.getWorkspace.execute({
          requestingTenantId: workspaceId,
          workspaceId,
        });
        if (workspace.owner_user_id !== userId) {
          reply.code(403).send({ code: "FORBIDDEN", message: "cross-tenant access denied (SEC-01)" });
          return null;
        }
        return workspace.tenant_id;
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "AccessDeniedError") {
          reply.code(403).send({ code: "FORBIDDEN", message: "cross-tenant access denied (SEC-01)" });
          return null;
        }
        return workspaceId;
      }
    }

    return userId;
  }

  const devTenant = request.headers["x-dev-tenant-id"];
  if (typeof devTenant === "string" && devTenant.length > 0) {
    return devTenant;
  }

  reply.code(401).send({
    code: "UNAUTHENTICATED",
    message: "Authorization: Bearer <token> or x-dev-tenant-id header required",
  });
  return null;
}

