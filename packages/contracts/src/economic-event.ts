// Contrat EconomicEvent (CDC v2.2 chapitre 11, DATA-01, DATA-02).
// DATA-01 : unique par tenant et source (rejouer un webhook ne doit pas
// modifier deux fois le solde). DATA-02 : une prevision reste separee du
// cash confirme.
import { z } from "zod";
import {
  AssetIdSchema,
  IdSchema,
  IsoDateTimeSchema,
  MoneySchema,
  PositiveDecimalStringSchema,
  TenantIdSchema,
} from "./primitives.js";

export const EventDirectionSchema = z.enum(["inflow", "outflow"]);

// declared|imported|provider_verified|ledger_verified (CDC chapitre 11) :
// declare et importe ne valent pas verifie pour l'octroi de credit.
export const VerificationSchema = z.enum([
  "declared",
  "imported",
  "provider_verified",
  "ledger_verified",
]);
export type Verification = z.infer<typeof VerificationSchema>;

// expected = prevu (n'alimente jamais le cash confirme, DATA-02) ;
// settled = reglement observe ; cancelled = retire du calendrier.
export const EventStatusSchema = z.enum(["expected", "settled", "cancelled"]);

export const EconomicEventSchema = z.object({
  id: IdSchema,
  tenant_id: TenantIdSchema,
  // Unicite (DATA-01) : (tenant_id, connection_ref, source_event_id) ou
  // (tenant_id, source_event_id) pour une saisie manuelle sans connexion.
  source_event_id: z.string().min(1),
  connection_ref: z.string().min(1).optional(),
  direction: EventDirectionSchema,
  amount: MoneySchema,
  status: EventStatusSchema,
  verification: VerificationSchema,
  label: z.string().min(1).max(200),
  occurred_at: IsoDateTimeSchema.optional(),
  observed_at: IsoDateTimeSchema,
  expected_settlement_at: IsoDateTimeSchema.optional(),
  raw_object_ref: z.string().min(1).optional(),
}).strict();

export const DeclaredEventRequestSchema = z.object({
  direction: EventDirectionSchema,
  amount_decimal: PositiveDecimalStringSchema,
  asset_id: AssetIdSchema,
  label: z.string().min(1).max(200),
  expected_settlement_at: IsoDateTimeSchema.optional(),
}).strict();
export type DeclaredEventRequest = z.infer<typeof DeclaredEventRequestSchema>;

export type EconomicEvent = z.infer<typeof EconomicEventSchema>;
