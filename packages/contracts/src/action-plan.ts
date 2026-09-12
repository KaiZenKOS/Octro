// Contrat ActionPlan Octro (CDC v2.2 chapitres 13, 19, 20). Distinct du
// payload de proposition externe docs/v2.2/plan.schema.json (schema_version
// 2.1, conserve tel quel comme annexe) : celui-ci est notre representation
// interne, versionnee independamment (docs/architecture.md, packages/contracts).
import { z } from "zod";
import {
  AssetIdSchema,
  IdSchema,
  IsoDateTimeSchema,
  PositiveDecimalStringSchema,
  TenantIdSchema,
} from "./primitives.js";
import { VerificationSchema } from "./economic-event.js";

export const ActionPlanPurposeSchema = z.enum([
  "cashflow_forecast",
  "no_debt_plan",
  "financing_comparison",
]);

// Cycle d'une proposition personnelle sans mouvement reel (CDC chapitre 20).
// Le cycle de credit (APPROVAL_PENDING -> ... -> CONFIRMED) appartient au lot
// d'Augustin/Samet S4 et n'est pas modelise ici tant qu'il n'est pas construit.
export const PersonalPlanStatusSchema = z.enum([
  "DRAFT",
  "PROPOSED",
  "ACKNOWLEDGED",
  "DISMISSED",
  "EXPIRED",
]);

const NoActionSchema = z.object({ type: z.literal("no_action") });

const OwnFundsTransferSchema = z.object({
  type: z.literal("own_funds_transfer"),
  source_account_ref: z.string().min(1),
  destination_account_ref: z.string().min(1),
  asset_id: AssetIdSchema,
  amount_decimal: PositiveDecimalStringSchema,
});

const OptionalExpenseAdjustmentSchema = z.object({
  type: z.literal("optional_expense_adjustment"),
  budget_item_ref: z.string().min(1),
});

const DueDateChangeRequestSchema = z.object({
  type: z.literal("due_date_change_request"),
  obligation_ref: z.string().min(1),
});

const FinancingComparisonSchema = z.object({
  type: z.literal("financing_comparison"),
  comparison_ref: z.string().min(1),
});

// Reprend exactement les cinq actions MVP du chapitre 19 (Actions MVP).
export const ProposedActionSchema = z.discriminatedUnion("type", [
  NoActionSchema,
  OwnFundsTransferSchema,
  OptionalExpenseAdjustmentSchema,
  DueDateChangeRequestSchema,
  FinancingComparisonSchema,
]);

export const ActionPlanSchema = z.object({
  id: IdSchema,
  // tenant_id == id du Workspace (docs/architecture.md) : pas de champ
  // workspace_id separe.
  tenant_id: TenantIdSchema,
  version: z.number().int().min(1),
  purpose: ActionPlanPurposeSchema,
  status: PersonalPlanStatusSchema,
  data_quality: VerificationSchema.or(z.literal("mixed")),
  // Un plan sans dette ne porte pas de principal de credit (chapitre 19).
  proposed_actions: z.array(ProposedActionSchema).min(1),
  plan_hash: z.string().regex(/^[0-9a-f]{64}$/, "plan_hash must be a sha256 hex digest"),
  created_at: IsoDateTimeSchema,
  expires_at: IsoDateTimeSchema.optional(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type ProposedAction = z.infer<typeof ProposedActionSchema>;
