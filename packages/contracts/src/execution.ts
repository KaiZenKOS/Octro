// Contrat Execution (CDC v2.2 chapitres 19-20, SEC-03, XRP-03).
// Distingue action simulee, instruction a realiser soi-meme et operation
// reellement executee (chapitre 7) ; outcome_unknown couvre un resultat
// ambigu qui doit etre reconcilie avant toute nouvelle transaction.
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, TenantIdSchema } from "./primitives.js";

export const ExecutionKindSchema = z.enum(["simulated", "instruction", "real"]);

export const ExecutionOutcomeSchema = z.enum([
  "pending",
  "confirmed",
  "outcome_unknown",
  "failed",
]);

export const ExecutionSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  plan_id: IdSchema,
  approval_id: IdSchema.optional(),
  idempotency_key: z.string().min(1),
  kind: ExecutionKindSchema,
  outcome: ExecutionOutcomeSchema,
  occurred_at: IsoDateTimeSchema,
  evidence_refs: z.array(z.string().min(1)),
});

export type Execution = z.infer<typeof ExecutionSchema>;
