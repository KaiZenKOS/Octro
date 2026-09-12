import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NetworkCapabilities } from "@octro/contracts";
import {
  UNVERIFIED_HACKATHON_CAPABILITIES,
} from "@octro/application";
import { loadVerifiedNetworkCapabilitiesFromFile } from "@octro/xrpl";

export interface NetworkCapabilitiesConfigOptions {
  /** Explicit path, useful for containers and deterministic tests. */
  configPath?: string;
  /** Defaults to this module URL; override only in tests. */
  moduleUrl?: string;
  cwd?: string;
  envPath?: string;
}

/**
 * Loads the checked Track 1 registry from a stable source location in source
 * and compiled layouts. Missing or malformed configuration yields the
 * application-owned all-unverified snapshot: finance closes while projection
 * remains independent (NET-02).
 */
export function loadNetworkCapabilitiesConfig(
  options: NetworkCapabilitiesConfigOptions = {},
): NetworkCapabilities {
  const cwd = options.cwd ?? process.cwd();
  const explicitPath = options.configPath ?? options.envPath ?? process.env["OCTRO_HACKATHON_CONFIG_FILE"];
  const moduleUrl = options.moduleUrl ?? import.meta.url;
  const candidates = explicitPath
    ? [resolve(cwd, explicitPath)]
    : [
        resolve(dirname(fileURLToPath(moduleUrl)), "../../../../docs/v2.2/hackathon.config.json"),
        resolve(cwd, "docs/v2.2/hackathon.config.json"),
      ];

  for (const candidate of [...new Set(candidates)]) {
    if (!existsSync(candidate)) continue;
    try {
      return loadVerifiedNetworkCapabilitiesFromFile(candidate);
    } catch {
      // Do not fall through to another copy after finding an invalid source;
      // that would hide deployment drift. This default is fail-closed.
      return UNVERIFIED_HACKATHON_CAPABILITIES;
    }
  }
  return UNVERIFIED_HACKATHON_CAPABILITIES;
}
