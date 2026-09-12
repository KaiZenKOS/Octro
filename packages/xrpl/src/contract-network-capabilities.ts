/**
 * Converts the checked Track 1 Loaded registry into the small contract
 * returned by GET /v1/network-capabilities. The human-maintained registry is
 * the source of checked evidence; its notes and evidence references are not
 * copied into the API response, and this adapter never promotes a fixture to
 * a network proof (EVID-01).
 */
import { readFileSync } from "node:fs";
import type { NetworkCapabilities } from "@octro/contracts";
import { NetworkCapabilitiesSchema } from "@octro/contracts";

const EXPECTED = {
  spec_version: "2.2",
  track: 1,
  flavour: "Loaded",
  protocol: "V1",
  vault: "open-ended",
  network: "custom-hackathon-devnet",
  network_id: 4001,
  sdk_package: "xrpl",
  sdk_version: "5.2.0",
} as const;

const REQUIRED_LOADED_CAPABILITIES = [
  "lending_v1",
  "single_asset_vault",
  "credentials",
  "permissioned_domains",
  "sponsorship",
  "did",
] as const;

interface HackathonConfigShape {
  spec_version: string;
  track: number;
  flavour: string;
  protocol: string;
  vault: string;
  network: string;
  network_id: number | null;
  sdk_package: string;
  sdk_version: string | null;
  ledger_verified: boolean;
  checked_at?: string | null;
  primary_loaded: string[];
  capabilities: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseHackathonConfig(value: unknown): HackathonConfigShape {
  if (!isRecord(value)) throw new TypeError("Track 1 configuration must be an object");

  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (value[key] !== expected) {
      throw new TypeError(`Track 1 configuration has an unexpected ${key}`);
    }
  }
  if (typeof value.ledger_verified !== "boolean") {
    throw new TypeError("Track 1 configuration must state ledger_verified explicitly");
  }
  const networkId = value.network_id;
  if (networkId !== null && networkId !== EXPECTED.network_id) {
    throw new TypeError("Track 1 configuration network_id does not match the hackathon Devnet");
  }
  const sdkVersion = value.sdk_version;
  if (sdkVersion !== null && sdkVersion !== EXPECTED.sdk_version) {
    throw new TypeError("Track 1 configuration SDK version does not match the locked stable SDK");
  }
  const primaryLoaded = value["primary_loaded"];
  if (!Array.isArray(primaryLoaded) || !["credentials", "permissioned_domains"].every(
    (item) => primaryLoaded.includes(item),
  )) {
    throw new TypeError("Track 1 Loaded requires Credentials and Permissioned Domains as primary extensions");
  }
  if (!isRecord(value.capabilities)) {
    throw new TypeError("Track 1 configuration capabilities must be an object");
  }
  for (const [key, status] of Object.entries(value.capabilities)) {
    if (typeof status !== "string") {
      throw new TypeError(`Track 1 capability ${key} must have a string status`);
    }
  }
  if (value.checked_at !== undefined && value.checked_at !== null && typeof value.checked_at !== "string") {
    throw new TypeError("Track 1 configuration checked_at must be a timestamp or null");
  }
  if (value.ledger_verified && (networkId !== EXPECTED.network_id || sdkVersion !== EXPECTED.sdk_version || !value.checked_at)) {
    throw new TypeError("A verified Track 1 registry requires NetworkID, the pinned SDK and a check timestamp");
  }

  return value as unknown as HackathonConfigShape;
}

/**
 * Pure mapping. Unknown statuses and missing required capabilities become
 * `unverified`. A false network gate also downgrades any stale `verified`
 * entries, while explicit `unsupported` remains visible.
 */
export function toContractNetworkCapabilities(input: unknown): NetworkCapabilities {
  const config = parseHackathonConfig(input);
  const capabilities: Record<string, "verified" | "unverified" | "unsupported"> = {};
  const names = new Set([...REQUIRED_LOADED_CAPABILITIES, ...Object.keys(config.capabilities)]);
  for (const key of names) {
    const status = config.capabilities[key];
    capabilities[key] = status === "unsupported"
      ? "unsupported"
      : config.ledger_verified && config.network_id === EXPECTED.network_id && config.sdk_version === EXPECTED.sdk_version && status === "verified"
        ? "verified"
        : "unverified";
  }

  return NetworkCapabilitiesSchema.parse({
    network: config.network,
    network_id: config.network_id,
    sdk_package: config.sdk_package,
    sdk_version: config.sdk_version,
    ledger_verified: config.ledger_verified,
    capabilities,
    checked_at: config.checked_at ?? null,
  });
}

/** Reads and strictly validates the registry at an explicit path. */
export function loadVerifiedNetworkCapabilitiesFromFile(hackathonConfigPath: string): NetworkCapabilities {
  const raw: unknown = JSON.parse(readFileSync(hackathonConfigPath, "utf8"));
  return toContractNetworkCapabilities(raw);
}
