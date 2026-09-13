// Contrat Error (CDC v2.2 chapitre 19, "Codes minimaux"). Liste exacte du
// pack : ne pas ajouter un code de confort qui ne figure pas dans le CDC.
// L'isolation tenant (SEC-01) et l'authentification sont des refus HTTP
// (403/401) traites hors de cet enum, avant d'atteindre un cas d'usage.
import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "DATA_STALE",
  "POLICY_DENIED",
  "COMPLIANCE_REQUIRED",
  "INFEASIBLE",
  "PLAN_EXPIRED",
  "VERSION_CONFLICT",
  "INSUFFICIENT_LIQUIDITY",
  "NETWORK_UNSUPPORTED",
  "SIGNATURE_REJECTED",
  "LEDGER_OUTCOME_UNKNOWN",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// "Aucun retry aveugle de ces deux derniers cas" (chapitre 19) :
// NETWORK_UNSUPPORTED et SIGNATURE_REJECTED ne sont jamais retryable.
export const NON_RETRYABLE_ERROR_CODES: ReadonlySet<ErrorCode> = new Set([
  "NETWORK_UNSUPPORTED",
  "SIGNATURE_REJECTED",
]);

export const ErrorPayloadSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
  trace_id: z.string().min(1),
});

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
