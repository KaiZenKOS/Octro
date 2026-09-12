import { describe, expect, it } from "vitest";
import { BufferOverdraftError, assertAdvanceWithinBalance } from "../src/buffer.js";

describe("assertAdvanceWithinBalance", () => {
  it("blocks an advance exceeding the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance(100n, 50n)).toThrow(BufferOverdraftError);
  });

  it("allows an advance within the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance(50n, 100n)).not.toThrow();
  });

  it("allows an advance exactly equal to the buffer balance", () => {
    expect(() => assertAdvanceWithinBalance(100n, 100n)).not.toThrow();
  });
});
