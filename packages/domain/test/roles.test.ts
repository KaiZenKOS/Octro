import { describe, expect, it } from "vitest";
import { ForbiddenRoleError, assertCanApprove } from "../src/roles.js";

describe("assertCanApprove (SEC-01)", () => {
  it("allows an owner and an approver", () => {
    expect(() => assertCanApprove("owner")).not.toThrow();
    expect(() => assertCanApprove("approver")).not.toThrow();
  });

  it("refuses an analyst acting as approbateur", () => {
    expect(() => assertCanApprove("analyst")).toThrow(ForbiddenRoleError);
  });
});
