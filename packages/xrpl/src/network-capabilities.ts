/**
 * NetworkCapabilitiesPort adapter — G0 (A1, HACK-01, XRP-01).
 *
 * Read-only: server_info + feature (amendments). No seed is required to
 * run this adapter, so it can be called on every deploy/CI run of the
 * Devnet workflow without touching any test account.
 *
 * Verified once by hand on 2026-09-12 (see docs/progress/augustin.md and
 * docs/progress/augustin/evidence/g0-network-capabilities.json for the
 * raw, timestamped result this adapter is modeled on): network_id 4001,
 * build_version 3.4.0-rc1, xrpl.js 5.2.0. This file reproduces that same
 * call in code; it does not replay a cached result.
 */
import { Client } from "xrpl";
import { NetworkCapabilitiesPort } from "./ports.js";
import { NetworkCapabilitySnapshot } from "./types.js";

export const HACKATHON_DEVNET = {
  wss: "wss://lending-hackathon.dev.ripplex.io:51233",
  rpc: "https://lending-hackathon.dev.ripplex.io:51234",
};

export const VERIFIED_SDK_VERSION = "5.2.0"; // xrpl.js, stable (not a *-beta tag)

export class XrplNetworkCapabilitiesAdapter implements NetworkCapabilitiesPort {
  constructor(private readonly wssUrl: string = HACKATHON_DEVNET.wss) {}

  async getSnapshot(): Promise<NetworkCapabilitySnapshot> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const serverInfo = await client.request({ command: "server_info" });
      const feature = await client.request({ command: "feature" });
      const enabledAmendments = Object.values(feature.result.features as Record<string, { name?: string; enabled?: boolean }>)
        .filter((entry) => entry.enabled)
        .map((entry) => entry.name)
        .filter((name): name is string => Boolean(name))
        .sort();

      const info = serverInfo.result.info as {
        network_id?: number;
        build_version?: string;
        validated_ledger?: { seq?: number; hash?: string };
      };

      return {
        observed_at_utc: new Date().toISOString(),
        network: "custom-hackathon-devnet",
        rpc_url: HACKATHON_DEVNET.rpc,
        wss_url: this.wssUrl,
        network_id: info.network_id ?? null,
        build_version: info.build_version ?? null,
        validated_ledger_seq: info.validated_ledger?.seq ?? null,
        validated_ledger_hash: info.validated_ledger?.hash ?? null,
        enabled_amendments: enabledAmendments,
        sdk_package: "xrpl",
        sdk_version: VERIFIED_SDK_VERSION,
        status: "ready",
      };
    } finally {
      await client.disconnect();
    }
  }
}
