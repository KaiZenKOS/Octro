import { describe, expect, it } from "vitest";
import { isCapabilityUsable, NetworkCapabilitiesSchema } from "../src/network-capabilities.js";

const unverified = NetworkCapabilitiesSchema.parse({
  network: "custom-hackathon-devnet",
  network_id: null,
  sdk_package: "xrpl",
  sdk_version: null,
  ledger_verified: false,
  capabilities: { lending_v1: "unverified", credentials: "unverified" },
  checked_at: null,
});

describe("NetworkCapabilities (NET-02)", () => {
  it("parses the unverified starting state from hackathon.config.json", () => {
    expect(unverified.ledger_verified).toBe(false);
  });

  it("reports an unverified capability as unusable for finance", () => {
    expect(isCapabilityUsable(unverified, "lending_v1")).toBe(false);
  });

  it("reports a verified capability on a verified ledger as usable", () => {
    const verified = { ...unverified, ledger_verified: true, capabilities: { lending_v1: "verified" as const } };
    expect(isCapabilityUsable(verified, "lending_v1")).toBe(true);
  });
});
