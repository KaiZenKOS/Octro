// Contrat Workspace (CDC v2.2 chapitre 11, PER-03, PER-09).
// Un Workspace personnel n'exige jamais d'Organization ; tenant_id reste la
// cle d'isolation commune aux deux natures d'espace.
import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, TenantIdSchema } from "./primitives.js";

export const WorkspaceKindSchema = z.enum(["personal", "organization"]);
export type WorkspaceKind = z.infer<typeof WorkspaceKindSchema>;

const WorkspaceBaseSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  kind: WorkspaceKindSchema,
  owner_user_id: IdSchema,
  organization_id: IdSchema.optional(),
  display_name: z.string().min(1).max(120),
  created_at: IsoDateTimeSchema,
});

// PER-03 : le schema refuse un Workspace personnel porteur d'organization_id
// et un Workspace d'organisation qui en serait depourvu.
export const WorkspaceSchema = WorkspaceBaseSchema.superRefine((workspace, ctx) => {
  if (workspace.kind === "personal" && workspace.organization_id !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "a personal workspace must not carry an organization_id (PER-03)",
      path: ["organization_id"],
    });
  }
  if (workspace.kind === "organization" && workspace.organization_id === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "an organization workspace requires organization_id",
      path: ["organization_id"],
    });
  }
  // tenant_id est la cle d'isolation du Workspace lui-meme (docs/architecture.md).
  if (workspace.tenant_id !== workspace.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "tenant_id must equal the workspace id",
      path: ["tenant_id"],
    });
  }
});

export type Workspace = z.infer<typeof WorkspaceBaseSchema>;
