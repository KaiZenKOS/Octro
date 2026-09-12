import {
  AccessDeniedError,
  BufferOverdraftError,
  CreditNotApprovedError,
  ForbiddenRoleError,
  InvalidWorkspaceError,
  KycNotValidError,
  NetworkCapabilityUnavailableError,
} from "@octro/domain";
import {
  EmailAlreadyRegisteredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  LendingOperationFailedError,
  NotFoundError,
  VerificationCodeInvalidError,
} from "@octro/application";
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
  if (err instanceof EmailAlreadyRegisteredError) {
    return reply.code(409).send({ code: "EMAIL_ALREADY_REGISTERED", message: err.message });
  }
  if (err instanceof InvalidCredentialsError) {
    return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: err.message });
  }
  if (err instanceof EmailNotVerifiedError) {
    return reply.code(403).send({ code: "EMAIL_NOT_VERIFIED", message: err.message });
  }
  if (err instanceof VerificationCodeInvalidError) {
    return reply.code(400).send({ code: "VERIFICATION_CODE_INVALID", message: err.message });
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
  if (err instanceof KycNotValidError) {
    return reply.code(403).send({ code: "COMPLIANCE_REQUIRED", message: err.message });
  }
  if (err instanceof CreditNotApprovedError) {
    return reply.code(403).send({ code: "COMPLIANCE_REQUIRED", message: err.message });
  }
  if (err instanceof BufferOverdraftError) {
    return reply.code(409).send({ code: "INSUFFICIENT_LIQUIDITY", message: err.message, retryable: false });
  }
  if (err instanceof LendingOperationFailedError) {
    // Un PortResult XRPL non-"ready" ne devient jamais un succes optimiste
    // (chapitre 32) : chaque issue est mappee explicitement, jamais repliee
    // sur un 500 generique.
    if (err.outcome === "rejected") {
      return reply.code(409).send({ code: "SIGNATURE_REJECTED", message: err.message, retryable: false, details: { evidence: err.detail } });
    }
    if (err.outcome === "unsupported") {
      return reply.code(409).send({ code: "NETWORK_UNSUPPORTED", message: err.message, retryable: false, details: { reason: err.detail } });
    }
    if (err.outcome === "unavailable") {
      return reply.code(503).send({ code: "LEDGER_OUTCOME_UNKNOWN", message: err.message, retryable: true, details: { reason: err.detail } });
    }
    return reply.code(409).send({ code: "LEDGER_OUTCOME_UNKNOWN", message: err.message, retryable: false, details: { reason: err.detail } });
  }
  reply.log.error(err);
  return reply.code(500).send({ code: "INTERNAL", message: "unexpected error" });
}
