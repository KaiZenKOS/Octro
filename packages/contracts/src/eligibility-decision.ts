// Contrat EligibilityDecision (CDC v2.2 chapitres 17-18, LOAD-01, LOAD-02).
// Reste volontairement abstrait : Credentials/Domains (S5, A4) et Stripe
// Identity (S5) ne sont pas encore integres. Ce contrat separe deja la
// decision applicative du controle ledger, sans preter a l'un les effets de
// l'autre (ARCH-LOAD-01).
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, TenantIdSchema } from "./primitives.js";

export const EligibilityRoleSchema = z.enum(["borrower", "lender"]);
export const EligibilityStatusSchema = z.enum(["eligible", "ineligible", "unknown"]);

export const EligibilityDecisionSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  subject_user_id: IdSchema,
  role: EligibilityRoleSchema,
  status: EligibilityStatusSchema,
  // References vers les attestations/credentials evaluees ; le contenu de
  // l'attestation elle-meme n'est pas modelise avant S5/A4.
  basis_refs: z.array(z.string().min(1)),
  decided_at: IsoDateTimeSchema,
  // NET-02 : une decision applicative eligible n'implique jamais qu'une
  // capacite reseau correspondante est verifiee.
  network_capability_verified: z.boolean(),
});

export type EligibilityDecision = z.infer<typeof EligibilityDecisionSchema>;
