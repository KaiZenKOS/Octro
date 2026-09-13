import { describe, expect, it } from "vitest";
import {
  addDecimal,
  compareDecimal,
  isPositiveDecimal,
  minDecimal,
  subtractDecimal,
} from "../src/decimal-support.js";

// Integration xrpl-lending-sim : ces helpers doivent traiter identiquement
// des drops XRP entiers et une valeur decimale d'IOU (ex. RLUSD simule),
// toujours en arithmetique de chaine (jamais un flottant JS).
describe("decimal-support", () => {
  it("adds and subtracts integer drops exactly", () => {
    expect(addDecimal("1000000", "500000")).toBe("1500000");
    expect(subtractDecimal("1000000", "500000")).toBe("500000");
  });

  it("adds and subtracts IOU decimals without floating-point drift", () => {
    expect(addDecimal("0.1", "0.2")).toBe("0.3");
    expect(subtractDecimal("10.5", "0.25")).toBe("10.25");
  });

  it("compares decimals correctly", () => {
    expect(compareDecimal("1.5", "1.50")).toBe(0);
    expect(compareDecimal("1.4", "1.5")).toBe(-1);
    expect(compareDecimal("1.6", "1.5")).toBe(1);
  });

  it("picks the minimum of two decimals", () => {
    expect(minDecimal("12.5", "100")).toBe("12.5");
    expect(minDecimal("100", "12.5")).toBe("12.5");
  });

  it("detects positive decimals, rejecting zero and negatives", () => {
    expect(isPositiveDecimal("0.000001")).toBe(true);
    expect(isPositiveDecimal("0")).toBe(false);
    expect(isPositiveDecimal("-1")).toBe(false);
  });
});
