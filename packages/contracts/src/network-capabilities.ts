// Contrat NetworkCapabilities (CDC v2.2 chapitre 16, NET-02, HACK-01, XRP-01).
// Miroir type de docs/v2.2/hackathon.config.json : les valeurs null/unverified
// signalent une verification a realiser (G0), jamais un succes implicite.
import { z } from "zod";
import { IsoDateTimeSchema } from "./primitives.js";

export const CapabilityStatusSchema = z.enum(["verified", "unverified", "unsupported"]);

export const NetworkCapabilitiesSchema = z.object({
  network: z.string().min(1),
  network_id: z.number().int().nonnegative().nullable(),
  sdk_package: z.string().min(1),
  sdk_version: z.string().min(1).nullable(),
  ledger_verified: z.boolean(),
  capabilities: z.record(z.string(), CapabilityStatusSchema),
  checked_at: IsoDateTimeSchema.nullable(),
});

export type NetworkCapabilities = z.infer<typeof NetworkCapabilitiesSchema>;

// NET-02 : une capacite non "verified" bloque uniquement la finance ; elle ne
// doit jamais etre invoquee pour interdire une projection ou un calendrier.
export function isCapabilityUsable(
  capabilities: NetworkCapabilities,
  capability: string,
): boolean {
  return capabilities.ledger_verified && capabilities.capabilities[capability] === "verified";
}
