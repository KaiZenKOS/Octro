/**
 * Maps this session's real, verified G0-and-beyond results into
 * @octro/contracts's NetworkCapabilities shape, for Samet's
 * NetworkCapabilitiesPort (packages/application/src/ports/
 * network-capabilities-port.ts).
 *
 * That port's own comment says: "L'adaptateur reel interroge XRPL
 * apres G0 (Augustin, A1)". This is that real adapter's data source:
 * docs/v2.2/hackathon.config.json, the single git-tracked file this
 * session has been updating after each verified run (G0, then A2
 * through A6), rather than a second, hand-duplicated copy of the same
 * facts. Every value traces to a transaction hash or a real network
 * response recorded in docs/progress/augustin/evidence/ — see
 * hackathon.config.json's own "capability_notes" field for exactly
 * which evidence file backs each "verified" entry (EVID-01: no
 * fabricated status).
 *
 * NOTE for whoever wires this in (Samet, or anyone touching
 * apps/api/src/composition.ts): this is a proposal, not a change to
 * your files. Swap:
 *   const capabilities = new StaticNetworkCapabilitiesAdapter(UNVERIFIED_HACKATHON_CAPABILITIES);
 * for:
 *   import { loadVerifiedNetworkCapabilitiesFromFile } from "@octro/xrpl";
 *   const capabilities = new StaticNetworkCapabilitiesAdapter(
 *     loadVerifiedNetworkCapabilitiesFromFile(
 *       path.resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json")
 *     )
 *   );
 * StaticNetworkCapabilitiesAdapter itself needs no change: it already
 * just returns whatever NetworkCapabilities object it was constructed
 * with.
 */
import { readFileSync } from "node:fs";
import type { NetworkCapabilities } from "@octro/contracts";
import { NetworkCapabilitiesSchema } from "@octro/contracts";

interface HackathonConfigShape {
  network: string;
  network_id: number | null;
  sdk_package: string;
  sdk_version: string | null;
  ledger_verified: boolean;
  checked_at?: string | null;
  capabilities: Record<string, string>;
}

/**
 * Pure mapping, no file I/O: takes the already-parsed
 * docs/v2.2/hackathon.config.json shape and produces a contract-valid
 * NetworkCapabilities object. capabilities values that are not exactly
 * "verified" or "unsupported" map to "unverified", since
 * NetworkCapabilitiesSchema's enum is narrower than this file's own
 * capability_notes-carrying strings ever were before this change.
 */
export function toContractNetworkCapabilities(config: HackathonConfigShape): NetworkCapabilities {
  const capabilities: Record<string, "verified" | "unverified" | "unsupported"> = {};
  for (const [key, value] of Object.entries(config.capabilities)) {
    capabilities[key] = value === "verified" || value === "unsupported" ? value : "unverified";
  }
  const result: NetworkCapabilities = {
    network: config.network,
    network_id: config.network_id,
    sdk_package: config.sdk_package,
    sdk_version: config.sdk_version,
    ledger_verified: config.ledger_verified,
    capabilities,
    checked_at: config.checked_at ?? null,
  };
  // Fails loudly rather than silently handing the application a
  // malformed capabilities object (NET-02, EVID-01).
  return NetworkCapabilitiesSchema.parse(result);
}

/**
 * Reads and maps docs/v2.2/hackathon.config.json from an explicit
 * path (dependency injection, not a hardcoded monorepo-relative guess)
 * so this stays usable from any package's build output layout.
 */
export function loadVerifiedNetworkCapabilitiesFromFile(hackathonConfigPath: string): NetworkCapabilities {
  const raw = JSON.parse(readFileSync(hackathonConfigPath, "utf8")) as HackathonConfigShape;
  return toContractNetworkCapabilities(raw);
}
