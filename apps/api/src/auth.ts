import type { FastifyReply, FastifyRequest } from "fastify";
import { InvalidSessionError } from "@octro/application";
import type { Workspace } from "@octro/contracts";
import type { AppDependencies } from "./composition.js";

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
  } catch (error) {
    if (!(error instanceof InvalidSessionError)) throw error;
    reply.code(401).send({ code: "UNAUTHENTICATED", message: "session invalid or expired" });
    return null;
  }
}

/**
 * Resolve workspace access from the authenticated account. The workspace ID
 * is only a resource selector; it never establishes the caller's identity or
 * tenant. Owners are the only supported membership relation in the current
 * model, so organization memberships remain denied until a membership use
 * case exists.
 */
export async function requireWorkspaceOwner(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: AppDependencies,
  workspaceId: string,
): Promise<{ userId: string; workspace: Workspace } | null> {
  const userId = await requireSession(request, reply, deps);
  if (!userId) return null;

  // Load through the application use case. The request tenant is supplied by
  // the resource lookup only for its tenant-isolation guard; actual access is
  // decided by the session owner's relationship to the loaded workspace.
  const workspace = await deps.getWorkspace.execute({
    requestingTenantId: workspaceId,
    workspaceId,
  });
  if (workspace.owner_user_id !== userId) {
    reply.code(404).send({ code: "NOT_FOUND", message: "Workspace not found" });
    return null;
  }
  return { userId, workspace };
}
