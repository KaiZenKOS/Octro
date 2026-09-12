// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). KYC
// simule pour le hackathon (decision actee) : `simulated` est un litteral
// `true`, jamais autre chose — cela rend "pas de vrai KYC" vrai par
// construction (CMP-01 : "aucun KYC reel dans fixture"). Didit
// (KYC_PROVIDER=didit dans .env) reste dormant, non branche a ce contrat.
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./primitives.js";

export const KycStatusValueSchema = z.enum(["not_started", "valid", "invalid"]);
export type KycStatusValue = z.infer<typeof KycStatusValueSchema>;

export const KycStatusSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  status: KycStatusValueSchema,
  decided_at: IsoDateTimeSchema.nullable(),
  simulated: z.literal(true),
});
export type KycStatus = z.infer<typeof KycStatusSchema>;
