// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). Contrat
// public d'un compte : password_hash n'apparait jamais ici — c'est un champ
// de persistance uniquement (packages/application/src/ports/user-repository.ts).
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./primitives.js";

export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  email_verified_at: IsoDateTimeSchema.nullable(),
  created_at: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;
