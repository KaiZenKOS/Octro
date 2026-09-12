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
