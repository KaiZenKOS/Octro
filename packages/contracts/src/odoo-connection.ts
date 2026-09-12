// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). BYO
// (decision actee) : chaque utilisateur connecte son propre Odoo. La cle API
// n'apparait jamais ici — write-only cote route
// (apps/api/src/routes/credit.ts), jamais renvoyee, jamais dans ce contrat ;
// seul son chiffrement est persiste (packages/application/src/adapters/pg/pg-odoo-connection-repository.ts).
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./primitives.js";

export const OdooConnectionProviderSchema = z.enum(["odoo"]);
export type OdooConnectionProvider = z.infer<typeof OdooConnectionProviderSchema>;

export const OdooConnectionSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  provider: OdooConnectionProviderSchema,
  odoo_url: z.string().url(),
  odoo_db: z.string().min(1),
  created_at: IsoDateTimeSchema,
  last_used_at: IsoDateTimeSchema.nullable(),
});
export type OdooConnection = z.infer<typeof OdooConnectionSchema>;
