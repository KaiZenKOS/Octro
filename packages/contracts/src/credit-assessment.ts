// Extension Lending/KYC/Credit (hors du pack C1, voir index.ts). Reflete la
// methodologie du "Odoo Credit Assessment Report" (packages/credit/) :
// score composite pondere -> grade -> decision, plus un plafond de credit
// dans la devise native des livres Odoo de l'utilisateur (DATA-03 : montant
// decimal + actif identifie, jamais un flottant). La conversion en drops
// XRP pour une demande de pret reelle est une decision de la Phase E, pas
// de ce contrat.
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, MoneySchema } from "./primitives.js";

export const CreditGradeSchema = z.enum(["A", "B", "C", "D", "E"]);
export type CreditGrade = z.infer<typeof CreditGradeSchema>;

export const CreditDecisionSchema = z.enum(["approve", "approve_with_conditions", "decline"]);
export type CreditDecision = z.infer<typeof CreditDecisionSchema>;

export const CreditAssessmentSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  odoo_connection_id: IdSchema,
  generated_at: IsoDateTimeSchema,
  composite_score: z.number().min(0).max(100),
  grade: CreditGradeSchema,
  decision: CreditDecisionSchema,
  max_recommended_credit_line: MoneySchema,
  term_months: z.number().int().min(0),
  indicative_annual_rate_pct: z.number().min(0),
  risk_notes: z.array(z.string()),
  // Detail complet du rapport (P&L, bilan, aging AR/AP, plafonds
  // independants, etc.) — bag permissif, aussi persiste en jsonb ; les
  // champs ci-dessus sont la surface de decision typee.
  details: z.record(z.string(), z.unknown()),
});
export type CreditAssessment = z.infer<typeof CreditAssessmentSchema>;
