// Normalized subprocess contract between packages/application and the pure
// Python optimizer. It is separate from the HTTP response and carries only
// structured, deterministic results.
import { z } from "zod";
import { ProposedActionSchema } from "./action-plan.js";
import { EconomicEventSchema } from "./economic-event.js";
import { DecimalStringSchema, IsoDateTimeSchema, PositiveDecimalStringSchema, TenantIdSchema } from "./primitives.js";
import { ProjectionRequestSchema } from "./projection.js";

export const PersonalOptimizerInputSchema = ProjectionRequestSchema.extend({
  tenant_id: TenantIdSchema,
  as_of: IsoDateTimeSchema,
  events: z.array(EconomicEventSchema),
}).strict().superRefine((input, ctx) => {
  if (input.workspace_id !== input.tenant_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "tenant_id must equal workspace_id", path: ["tenant_id"] });
  }
});

export const PersonalOptimizerTracePointSchema = z.object({
  t: z.number().int().min(0),
  expected_balance_decimal: DecimalStringSchema,
  confirmed_balance_decimal: DecimalStringSchema,
}).strict();

export const PersonalOptimizerActionPointSchema = z.object({
  t: z.number().int().min(0),
  current_balance_decimal: PositiveDecimalStringSchema,
  savings_balance_decimal: PositiveDecimalStringSchema,
}).strict();

const OptimizerDiagnosticSchema = z.object({
  deficit_decimal: PositiveDecimalStringSchema,
  binding_constraints: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
}).strict();

const FeasibleOptimizerResultSchema = z.object({
  engine_version: z.string().min(1),
  status: z.literal("FEASIBLE"),
  trace: z.array(PersonalOptimizerTracePointSchema).min(1),
  action_trace: z.array(PersonalOptimizerActionPointSchema).min(1),
  proposed_actions: z.array(ProposedActionSchema).min(1),
  savings_remaining_decimal: PositiveDecimalStringSchema,
  diagnostic: z.null(),
}).strict();

const InfeasibleOptimizerResultSchema = z.object({
  engine_version: z.string().min(1),
  status: z.literal("INFEASIBLE"),
  trace: z.array(PersonalOptimizerTracePointSchema).min(1),
  action_trace: z.array(z.never()).length(0),
  proposed_actions: z.array(z.never()).length(0),
  savings_remaining_decimal: z.null(),
  diagnostic: OptimizerDiagnosticSchema,
}).strict();

export const PersonalOptimizerResultSchema = z.discriminatedUnion("status", [
  FeasibleOptimizerResultSchema,
  InfeasibleOptimizerResultSchema,
]);

export type PersonalOptimizerInput = z.infer<typeof PersonalOptimizerInputSchema>;
export type PersonalOptimizerResult = z.infer<typeof PersonalOptimizerResultSchema>;
