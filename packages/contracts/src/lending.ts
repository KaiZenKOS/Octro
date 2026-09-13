// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). Relation
// lender/borrower sur le vault ouvert + loan broker partages (decision
// actee), via l'adaptateur XRPL Lending V1 deja verifie en reel
// (packages/xrpl/src/lending-v1.ts, inchange). Integration xrpl-lending-sim :
// plusieurs actifs (XRP natif + RLUSD simule, IOU) — voir asset_id.
import { z } from "zod";
import { AssetIdSchema, IdSchema, IsoDateTimeSchema, PositiveDecimalStringSchema } from "./primitives.js";

// Chaine d'entiers non signee : un montant en drops XRP (plus petite unite,
// jamais un flottant) — vocabulaire ledger. Conservee pour compatibilite ;
// les champs de montant ci-dessous utilisent PositiveDecimalStringSchema
// (primitives.ts, C1), qui couvre aussi bien les drops XRP (entiers) que la
// valeur decimale d'un IOU (ex. RLUSD simule), jamais un flottant.
export const DropsStringSchema = z.string().regex(/^[0-9]+$/, "expected an unsigned integer string of drops");

export const LenderDepositStatusSchema = z.enum(["submitted", "confirmed", "rejected"]);
export type LenderDepositStatus = z.infer<typeof LenderDepositStatusSchema>;

export const LoanStatusSchema = z.enum(["requested", "active", "repaid", "defaulted"]);
export type LoanStatus = z.infer<typeof LoanStatusSchema>;

export const WithdrawalFundedFromSchema = z.enum(["vault", "buffer", "partial"]);
export type WithdrawalFundedFrom = z.infer<typeof WithdrawalFundedFromSchema>;

export const LenderDepositSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  vault_id: z.string().min(1),
  asset_id: AssetIdSchema,
  amount_drops: PositiveDecimalStringSchema,
  status: LenderDepositStatusSchema,
  tx_evidence: z.record(z.string(), z.unknown()).nullable(),
  created_at: IsoDateTimeSchema,
});
export type LenderDeposit = z.infer<typeof LenderDepositSchema>;

export const LoanPositionSchema = z.object({
  id: IdSchema,
  borrower_user_id: IdSchema,
  credit_assessment_id: IdSchema,
  loan_broker_id: z.string().min(1),
  // Null tant que le statut est "requested" : une tentative refusee/degradee
  // ne cree aucun objet loan on-chain (voir LendingOperationFailedError).
  loan_id: z.string().min(1).nullable(),
  asset_id: AssetIdSchema,
  principal_drops: PositiveDecimalStringSchema,
  // Echelle InterestRate de LoanSet (max 100000 = 100.000%), voir
  // packages/xrpl/src/ports.ts (LendingV1Port.acceptLoan).
  interest_rate_hundred_thousandths: z.number().int().min(0).max(100000),
  payment_interval_seconds: z.number().int().min(60),
  payment_total: z.number().int().min(1),
  grace_period_seconds: z.number().int().min(0),
  status: LoanStatusSchema,
  tx_evidence: z.record(z.string(), z.unknown()).nullable(),
  created_at: IsoDateTimeSchema,
});
export type LoanPosition = z.infer<typeof LoanPositionSchema>;

export const WithdrawalRequestSchema = z.object({
  id: IdSchema,
  lender_user_id: IdSchema,
  vault_id: z.string().min(1),
  asset_id: AssetIdSchema,
  requested_amount_drops: PositiveDecimalStringSchema,
  fulfilled_amount_drops: PositiveDecimalStringSchema,
  funded_from: WithdrawalFundedFromSchema,
  status: z.enum(["fulfilled", "partial", "failed"]),
  evidence: z.record(z.string(), z.unknown()).nullable(),
  created_at: IsoDateTimeSchema,
});
export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;
