import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { loadNetworkCapabilitiesConfig } from "../src/adapters/network-capabilities-config.js";
import { buildServer } from "../src/server.js";

describe("Track 1 Loaded network capability wiring (HACK-01, XRP-01, LOAD-01/02/03, NET-02, EVID-01)", () => {
  it("serves the checked registry values without exposing notes or treating fixtures as evidence", async () => {
    const app = buildServer(buildDependencies());
    try {
      const response = await app.inject({ method: "GET", url: "/v1/network-capabilities" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        network: "custom-hackathon-devnet",
        network_id: 4001,
        sdk_package: "xrpl",
        sdk_version: "5.2.0",
        ledger_verified: true,
        checked_at: "2026-09-12T15:13:52Z",
        capabilities: {
          lending_v1: "verified",
          single_asset_vault: "verified",
          credentials: "verified",
          permissioned_domains: "verified",
          sponsorship: "verified",
          did: "verified",
        },
      });
      expect(response.json()).not.toHaveProperty("capability_notes");
      expect(response.json()).not.toHaveProperty("g0_evidence_ref");
    } finally {
      await app.close();
    }
  });

  it("locates the same registry from source and compiled API layouts", () => {
    const sourceUrl = new URL("../src/adapters/network-capabilities-config.ts", import.meta.url).href;
    const buildUrl = new URL("../dist/adapters/network-capabilities-config.js", import.meta.url).href;
    const source = loadNetworkCapabilitiesConfig({ moduleUrl: sourceUrl, cwd: "C:/empty-working-directory" });
    const build = loadNetworkCapabilitiesConfig({ moduleUrl: buildUrl, cwd: "C:/empty-working-directory" });
    expect(source.network_id).toBe(4001);
    expect(build).toEqual(source);
  });

  it("fails closed for a missing, malformed or wrong-track file", () => {
    const missing = loadNetworkCapabilitiesConfig({
      configPath: resolve(import.meta.dirname, "missing.config.json"),
    });
    const wrongTrack = loadNetworkCapabilitiesConfig({
      configPath: resolve(import.meta.dirname, "fixtures/wrong-track.config.json"),
    });
    expect(missing.ledger_verified).toBe(false);
    expect(wrongTrack.ledger_verified).toBe(false);
    for (const snapshot of [missing, wrongTrack]) {
      expect(Object.values(snapshot.capabilities).filter((status) => status === "verified")).toEqual([]);
    }
  });
});
