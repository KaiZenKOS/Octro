import { describe, expect, it } from "vitest";
import { AssetIdSchema, DecimalStringSchema, MoneySchema, PositiveDecimalStringSchema } from "../src/primitives.js";

describe("DecimalStringSchema (DATA-03: refuser float)", () => {
  it("accepts a signed decimal string", () => {
    expect(DecimalStringSchema.safeParse("-130.00").success).toBe(true);
    expect(DecimalStringSchema.safeParse("1700.00").success).toBe(true);
    expect(DecimalStringSchema.safeParse("0").success).toBe(true);
  });

  it("rejects a JSON number and a malformed string", () => {
    // @ts-expect-error -- a float literal must not type-check as a decimal string
    expect(DecimalStringSchema.safeParse(1700.0).success).toBe(false);
    expect(DecimalStringSchema.safeParse("1700.").success).toBe(false);
    expect(DecimalStringSchema.safeParse("01700").success).toBe(false);
    expect(DecimalStringSchema.safeParse("1e10").success).toBe(false);
  });
});

describe("PositiveDecimalStringSchema", () => {
  it("rejects a negative amount for a proposed action", () => {
    expect(PositiveDecimalStringSchema.safeParse("-1.00").success).toBe(false);
    expect(PositiveDecimalStringSchema.safeParse("230.00").success).toBe(true);
  });
});

describe("AssetIdSchema (DATA-03: refuser un actif ambigu)", () => {
  it("accepts namespaced asset ids", () => {
    expect(AssetIdSchema.safeParse("fiat:EUR").success).toBe(true);
    expect(AssetIdSchema.safeParse("xrpl:XRP").success).toBe(true);
    expect(AssetIdSchema.safeParse("xrpl:rIssuer123:USD").success).toBe(true);
  });

  it("rejects a bare, unnamespaced code", () => {
    expect(AssetIdSchema.safeParse("EUR").success).toBe(false);
    expect(AssetIdSchema.safeParse("$").success).toBe(false);
  });
});

describe("MoneySchema", () => {
  it("requires both a decimal amount and a namespaced asset", () => {
    expect(MoneySchema.safeParse({ amount_decimal: "230.00", asset_id: "fiat:EUR" }).success).toBe(true);
    expect(MoneySchema.safeParse({ amount_decimal: "230.00", asset_id: "EUR" }).success).toBe(false);
  });
});
