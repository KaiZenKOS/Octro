import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { toContractNetworkCapabilities } from "../src/contract-network-capabilities.js";

describe("Track 1 Loaded capability mapping", () => {
  it("maps the observed hackathon registry to the shared strict contract", () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json"), "utf8"),
    ) as Record<string, unknown>;

    const result = toContractNetworkCapabilities(config);

    expect(result).toMatchObject({
      network: "custom-hackathon-devnet",
      network_id: 4001,
      sdk_package: "xrpl",
      sdk_version: "5.2.0",
      ledger_verified: true,
    });
    expect(result.capabilities).toMatchObject({
      lending_v1: "verified",
      single_asset_vault: "verified",
      credentials: "verified",
      permissioned_domains: "verified",
      sponsorship: "verified",
      did: "verified",
    });
  });

  it("fails closed when a capability is not explicitly verified or unsupported", () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json"), "utf8"),
    ) as Record<string, unknown>;
    const result = toContractNetworkCapabilities({
      ...config,
      capabilities: { ...(config.capabilities as Record<string, unknown>), lending_v1: "observed_once", credentials: "unsupported" },
    });

    expect(result.capabilities).toEqual({
      lending_v1: "unverified",
      single_asset_vault: "verified",
      credentials: "unsupported",
      permissioned_domains: "verified",
      sponsorship: "verified",
      did: "verified",
    });
  });

  it("rejects a mismatched track, vault mode, network, SDK or primary Loaded extension", () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json"), "utf8"),
    ) as Record<string, unknown>;
    for (const changed of [
      { ...config, track: 2 },
      { ...config, protocol: "V1.1" },
      { ...config, vault: "fixed-term" },
      { ...config, network_id: 21338 },
      { ...config, sdk_version: "5.2.0-beta.0" },
      { ...config, primary_loaded: ["credentials"] },
    ]) {
      expect(() => toContractNetworkCapabilities(changed)).toThrow();
    }
  });

  it("downgrades verified-looking statuses when the G0 ledger gate is false", () => {
    const config = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json"), "utf8"),
    ) as Record<string, unknown>;
    const result = toContractNetworkCapabilities({ ...config, ledger_verified: false });
    expect(result.ledger_verified).toBe(false);
    expect(Object.values(result.capabilities).filter((status) => status === "verified")).toEqual([]);
  });
});
