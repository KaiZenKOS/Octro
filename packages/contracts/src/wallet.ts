// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). La seed
// n'apparait jamais ici — write-once cote serveur a l'inscription, jamais
// renvoyee (packages/application/src/ports/wallet-repository.ts stocke son
// chiffrement). Custody serveur assumee pour la duree du hackathon (ecart
// documente vis-a-vis de WAL-01, voir docs/adr).
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./primitives.js";

export const WalletSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  address: z.string().min(1),
  network: z.string().min(1),
  created_at: IsoDateTimeSchema,
});
export type Wallet = z.infer<typeof WalletSchema>;
