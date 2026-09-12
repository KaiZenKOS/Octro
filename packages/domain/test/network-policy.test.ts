import { describe, expect, it } from "vitest";
import type { NetworkCapabilities } from "@octro/contracts";
import { NetworkCapabilityUnavailableError, assertFinancingCapability } from "../src/network-policy.js";

const unverified: NetworkCapabilities = {
  network: "custom-hackathon-devnet",
  network_id: null,
  sdk_package: "xrpl",
  sdk_version: null,
  ledger_verified: false,
  capabilities: { lending_v1: "unverified" },
  checked_at: null,
};

describe("assertFinancingCapability (NET-02)", () => {
  it("blocks financing when the network capability is unverified", () => {
    expect(() => assertFinancingCapability(unverified, "lending_v1")).toThrow(
      NetworkCapabilityUnavailableError,
    );
  });

  it("allows financing once the capability is verified on a verified ledger", () => {
    const verified: NetworkCapabilities = {
      ...unverified,
      ledger_verified: true,
      capabilities: { lending_v1: "verified" },
    };
    expect(() => assertFinancingCapability(verified, "lending_v1")).not.toThrow();
  });
});
