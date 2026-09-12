import { AccessDeniedError, ForbiddenRoleError, InvalidWorkspaceError, NetworkCapabilityUnavailableError } from "@octro/domain";
import { NotFoundError } from "@octro/application";
import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

// Traduction des erreurs applicatives en reponses HTTP (docs/architecture.md :
// "Entrees ... Validation du transport et traduction des erreurs, sans copie
// des regles metier"). NETWORK_UNSUPPORTED reprend le code minimal du
// chapitre 19 ; l'isolation tenant (SEC-01) reste un refus HTTP simple.
export function sendError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof ZodError) {
    return reply.code(400).send({ code: "INVALID_REQUEST", message: err.issues.map((i) => i.message).join("; ") });
  }
  if (err instanceof NotFoundError) {
    return reply.code(404).send({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof InvalidWorkspaceError) {
    return reply.code(400).send({ code: "INVALID_REQUEST", message: err.message });
  }
  if (err instanceof AccessDeniedError) {
    return reply.code(403).send({ code: "ACCESS_DENIED", message: err.message });
  }
  if (err instanceof ForbiddenRoleError) {
    return reply.code(403).send({ code: "POLICY_DENIED", message: err.message });
  }
  if (err instanceof NetworkCapabilityUnavailableError) {
    return reply.code(409).send({ code: "NETWORK_UNSUPPORTED", message: err.message, retryable: false });
  }
  reply.log.error(err);
  return reply.code(500).send({ code: "INTERNAL", message: "unexpected error" });
}
