import { describe, expect, it } from "vitest";
import { CreditNotApprovedError, assertCreditApproved } from "../src/credit.js";

describe("assertCreditApproved", () => {
  it("blocks a loan request when the assessment declined", () => {
    expect(() => assertCreditApproved("decline")).toThrow(CreditNotApprovedError);
  });

  it("allows a loan request when approved outright", () => {
    expect(() => assertCreditApproved("approve")).not.toThrow();
  });

  it("allows a loan request when approved with conditions", () => {
    expect(() => assertCreditApproved("approve_with_conditions")).not.toThrow();
  });
});
