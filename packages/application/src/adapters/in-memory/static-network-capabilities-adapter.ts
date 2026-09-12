import type { NetworkCapabilities } from "@octro/contracts";
import type { NetworkCapabilitiesPort } from "../../ports/network-capabilities-port.js";

// Doublure explicite (S1/S2). Reflete tel quel docs/v2.2/hackathon.config.json
// tant que G0 (Augustin, A1) n'a pas verifie le reseau : ne jamais renvoyer
// "verified" ici avant que ce soit reellement le cas (NET-02, EVID-01).
export class StaticNetworkCapabilitiesAdapter implements NetworkCapabilitiesPort {
  constructor(private readonly snapshot: NetworkCapabilities) {}

  async get(): Promise<NetworkCapabilities> {
    return this.snapshot;
  }
}

export const UNVERIFIED_HACKATHON_CAPABILITIES: NetworkCapabilities = {
  network: "custom-hackathon-devnet",
  network_id: null,
  sdk_package: "xrpl",
  sdk_version: null,
  ledger_verified: false,
  capabilities: {
    lending_v1: "unverified",
    single_asset_vault: "unverified",
    credentials: "unverified",
    permissioned_domains: "unverified",
    sponsorship: "unverified",
    did: "unverified",
  },
  checked_at: null,
};
