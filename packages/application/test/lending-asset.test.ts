import { describe, expect, it } from "vitest";
import { buildLendingAssetId, parseLendingAssetId } from "../src/lending-asset.js";

describe("lending-asset", () => {
  it("parses the native XRP asset id and passes native amounts through unchanged", () => {
    const asset = parseLendingAssetId("xrpl:XRP");
    expect(asset.ledgerAsset).toEqual({ currency: "XRP" });
    expect(asset.toLedgerAmount("1000000")).toBe("1000000");
  });

  it("parses a short-code IOU asset id (3 chars) using it as-is", () => {
    const asset = parseLendingAssetId("xrpl:USD:rIssuerAddress");
    expect(asset.ledgerAsset).toEqual({ currency: "USD", issuer: "rIssuerAddress" });
    expect(asset.toLedgerAmount("12.5")).toEqual({ currency: "USD", issuer: "rIssuerAddress", value: "12.5" });
  });

  it("encodes a non-3-char IOU code (e.g. RLUSD) as 40-hex-char ledger currency", () => {
    const asset = parseLendingAssetId("xrpl:RLUSD:rIssuerAddress");
    expect(asset.ledgerAsset.currency).toHaveLength(40);
    expect(asset.ledgerAsset).toEqual({ currency: asset.ledgerAsset.currency, issuer: "rIssuerAddress" });
  });

  it("rejects an unsupported namespace", () => {
    expect(() => parseLendingAssetId("eth:USDC:0xabc")).toThrow(/unsupported lending asset_id/);
  });

  it("rejects an IOU asset id missing the issuer", () => {
    expect(() => parseLendingAssetId("xrpl:RLUSD")).toThrow(/requires/);
  });

  it("builds asset ids symmetrically with parsing", () => {
    expect(buildLendingAssetId("XRP")).toBe("xrpl:XRP");
    expect(buildLendingAssetId("RLUSD", "rIssuerAddress")).toBe("xrpl:RLUSD:rIssuerAddress");
  });
});
