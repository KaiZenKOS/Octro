// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). Le code de
// verification lui-meme n'a pas de contrat public : il n'est jamais renvoye
// a un client (voir packages/application/src/use-cases/sign-up.ts).
import { z } from "zod";

export const EmailVerificationPurposeSchema = z.enum(["signup"]);
export type EmailVerificationPurpose = z.infer<typeof EmailVerificationPurposeSchema>;
