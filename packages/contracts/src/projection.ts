// Contrat Projection (CDC v2.2 chapitres 11-12, ACC-02, PER-11, NET-02, DATA-02).
// Une projection personnelle doit rester calculable sans wallet, DID, KYC ou
// session Stripe : elle ne porte que des soldes projetes/confirmes et leur
// provenance, jamais une capacite de financement.
import { z } from "zod";
import {
  AssetIdSchema,
  DecimalStringSchema,
  IdSchema,
  IsoDateTimeSchema,
  PositiveDecimalStringSchema,
  TenantIdSchema,
} from "./primitives.js";
import { VerificationSchema } from "./economic-event.js";

export const HorizonUnitSchema = z.enum(["day", "hour"]);

export const HorizonSchema = z.object({
  steps: z.number().int().min(1).max(366),
  unit: HorizonUnitSchema,
}).strict();

// Canonical POST /v1/projections contract. The projection endpoint is the
// personal, no-debt path: it needs only declared balances and a horizon, and
// stays independent from wallet, KYC and ledger capability state.
export const ProjectionRequestSchema = z.object({
  workspace_id: TenantIdSchema,
  asset_id: AssetIdSchema,
  opening_balances: z.object({
    current: PositiveDecimalStringSchema,
    savings: PositiveDecimalStringSchema,
  }).strict(),
  current_reserve: PositiveDecimalStringSchema,
  savings_protected_reserve: PositiveDecimalStringSchema,
  horizon: z.object({
    steps: z.number().int().min(1).max(30),
    unit: z.literal("day"),
  }).strict(),
}).strict();
export type ProjectionRequest = z.infer<typeof ProjectionRequestSchema>;

// DATA-02 : expected_balance (prevu) et confirmed_balance (cash reellement
// disponible) sont deux champs distincts pour le meme point dans le temps.
export const ProjectionPointSchema = z.object({
  t: z.number().int().min(0),
  asset_id: AssetIdSchema,
  expected_balance: DecimalStringSchema,
  confirmed_balance: DecimalStringSchema,
}).strict();

export const ProjectionSchema = z.object({
  id: IdSchema,
  // tenant_id == id du Workspace (docs/architecture.md) : pas de champ
  // workspace_id separe.
  tenant_id: TenantIdSchema,
  generated_at: IsoDateTimeSchema,
  as_of: IsoDateTimeSchema,
  horizon: HorizonSchema,
  data_quality: VerificationSchema.or(z.literal("mixed")),
  points: z.array(ProjectionPointSchema).min(1),
  // NET-02 : une capacite reseau ou de financement inconnue ne doit jamais
  // bloquer ce contrat ; elle est simplement absente ici.
}).strict();

export type Projection = z.infer<typeof ProjectionSchema>;
export type Horizon = z.infer<typeof HorizonSchema>;
