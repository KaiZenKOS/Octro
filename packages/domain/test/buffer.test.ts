import { describe, expect, it } from "vitest";
import { BufferOverdraftError, assertAdvanceWithinBalance } from "../src/buffer.js";

describe("assertAdvanceWithinBalance", () => {
  it("blocks an advance exceeding the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance("100", "50")).toThrow(BufferOverdraftError);
  });

  it("allows an advance within the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance("50", "100")).not.toThrow();
  });

  it("allows an advance exactly equal to the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance("100", "100")).not.toThrow();
  });

  it("allows a decimal advance (IOU, e.g. RLUSD simule) within a decimal buffer balance", () => {
    expect(() => assertAdvanceWithinBalance("12.5", "100.75")).not.toThrow();
  });
});
