// Primitives partagees par les neuf contrats C1 (CDC v2.2 chapitre 11).
// DATA-03 : montants decimaux et actif identifie. Refuse tout nombre flottant :
// un montant n'est jamais un `number` JSON, seulement une chaine decimale.
import { z } from "zod";

// Chaine decimale signee, jusqu'a 18 decimales (NUMERIC(38,18) cote PostgreSQL,
// cf. CDC chapitre 11). Le signe n'est autorise que pour des valeurs derivees
// (soldes projetes) ; les montants d'action soumis restent positifs, voir
// PositiveDecimalString ci-dessous.
export const DecimalStringSchema = z
  .string()
  .regex(/^-?(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/, "expected a decimal string, not a float");

// Reprend exactement le pattern de plan.schema.json (docs/v2.2/plan.schema.json)
// pour les montants d'actions proposees : jamais de signe negatif.
export const PositiveDecimalStringSchema = z
  .string()
  .regex(/^(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/, "expected a non-negative decimal string");

// "actif identifie" (DATA-03) : un namespace explicite empeche un actif
// ambigu. Exemples valides : fiat:EUR, xrpl:XRP, xrpl:<issuer>:<code>.
export const AssetIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_-]*:[A-Za-z0-9._-]+(:[A-Za-z0-9._-]+)?$/,
    "asset_id must be namespaced, e.g. fiat:EUR or xrpl:XRP",
  );

export const MoneySchema = z.object({
  amount_decimal: DecimalStringSchema,
  asset_id: AssetIdSchema,
});
export type Money = z.infer<typeof MoneySchema>;

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

// tenant_id == id du Workspace (CDC chapitre 11 et docs/architecture.md) :
// un identifiant unique sert de cle d'isolation pour tous les objets.
export const TenantIdSchema = z.string().uuid();
export const IdSchema = z.string().uuid();

export type AssetId = z.infer<typeof AssetIdSchema>;
