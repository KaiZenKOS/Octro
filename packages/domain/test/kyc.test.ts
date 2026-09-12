import { describe, expect, it } from "vitest";
import { KycNotValidError, assertKycValid } from "../src/kyc.js";

describe("assertKycValid (PER-11)", () => {
  it("blocks access when KYC is not started", () => {
    expect(() => assertKycValid("not_started")).toThrow(KycNotValidError);
  });

  it("blocks access when KYC was simulated invalid", () => {
    expect(() => assertKycValid("invalid")).toThrow(KycNotValidError);
  });

  it("allows access once KYC is valid", () => {
    expect(() => assertKycValid("valid")).not.toThrow();
  });
});
