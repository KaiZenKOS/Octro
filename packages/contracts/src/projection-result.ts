// Shared response for POST /v1/projections. A forecast is always returned;
// the action plan is absent when hard reserves make a safe no-debt action
// impossible (PER-02/PER-05).
import { z } from "zod";
import { ActionPlanSchema } from "./action-plan.js";
import { AssetIdSchema, IdSchema, IsoDateTimeSchema, PositiveDecimalStringSchema, TenantIdSchema } from "./primitives.js";
import { ProjectionSchema } from "./projection.js";

export const ProjectionProvenanceSchema = z.object({
  source: z.enum(["declared", "synthetic"]),
  fixture_id: z.string().min(1).optional(),
  as_of: IsoDateTimeSchema,
}).strict().superRefine((provenance, ctx) => {
  if (provenance.source === "synthetic" && provenance.fixture_id === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "synthetic projection provenance requires fixture_id",
      path: ["fixture_id"],
    });
  }
});

export const ProjectionDiagnosticSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  version: z.number().int().min(1),
  status: z.literal("INFEASIBLE"),
  code: z.literal("INFEASIBLE"),
  purpose: z.literal("no_debt_plan"),
  deficit: z.object({
    amount_decimal: PositiveDecimalStringSchema,
    asset_id: AssetIdSchema,
  }).strict(),
  binding_constraints: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
  proposed_actions: z.array(z.never()).length(0),
  plan_hash: z.string().regex(/^[0-9a-f]{64}$/),
  created_at: IsoDateTimeSchema,
}).strict();

const FeasibleProjectionResultSchema = z.object({
  status: z.literal("FEASIBLE"),
  projection: ProjectionSchema,
  action_plan: ActionPlanSchema,
  provenance: ProjectionProvenanceSchema,
}).strict();

const InfeasibleProjectionResultSchema = z.object({
  status: z.literal("INFEASIBLE"),
  projection: ProjectionSchema,
  diagnostic: ProjectionDiagnosticSchema,
  provenance: ProjectionProvenanceSchema,
}).strict();

export const ProjectionResultSchema = z.discriminatedUnion("status", [
  FeasibleProjectionResultSchema,
  InfeasibleProjectionResultSchema,
]);

export type ProjectionProvenance = z.infer<typeof ProjectionProvenanceSchema>;
export type ProjectionDiagnostic = z.infer<typeof ProjectionDiagnosticSchema>;
export type ProjectionResult = z.infer<typeof ProjectionResultSchema>;
