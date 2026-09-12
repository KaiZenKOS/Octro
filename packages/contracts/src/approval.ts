// Contrat Approval (CDC v2.2 chapitre 20, SEC-02). Porte le hash des termes,
// une expiration proposee de 5 minutes, et la version du plan approuve :
// toute modification du plan invalide l'approbation (verifie par le cas
// d'usage applicatif, pas par ce schema).
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, TenantIdSchema } from "./primitives.js";

export const ApprovalDecisionSchema = z.enum(["approved", "rejected"]);

export const ApprovalSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  plan_id: IdSchema,
  plan_version: z.number().int().min(1),
  terms_hash: z.string().regex(/^[0-9a-f]{64}$/),
  approver_user_id: IdSchema,
  decision: ApprovalDecisionSchema,
  decided_at: IsoDateTimeSchema,
  expires_at: IsoDateTimeSchema,
});

export type Approval = z.infer<typeof ApprovalSchema>;
