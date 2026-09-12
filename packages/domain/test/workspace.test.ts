import { describe, expect, it } from "vitest";
import { AccessDeniedError, InvalidWorkspaceError, assertSameTenant, createWorkspace } from "../src/workspace.js";

describe("createWorkspace (PER-03)", () => {
  it("creates a personal workspace with no organization required", () => {
    const workspace = createWorkspace({
      id: "11111111-1111-1111-1111-111111111111",
      ownerUserId: "22222222-2222-2222-2222-222222222222",
      kind: "personal",
      displayName: "Lina",
      createdAt: "2026-09-12T10:00:00Z",
    });
    expect(workspace.tenant_id).toBe(workspace.id);
    expect(workspace.organization_id).toBeUndefined();
  });

  it("rejects a personal workspace with an organization_id", () => {
    expect(() =>
      createWorkspace({
        id: "11111111-1111-1111-1111-111111111111",
        ownerUserId: "22222222-2222-2222-2222-222222222222",
        kind: "personal",
        organizationId: "33333333-3333-3333-3333-333333333333",
        displayName: "Lina",
        createdAt: "2026-09-12T10:00:00Z",
      }),
    ).toThrow(InvalidWorkspaceError);
  });
});

describe("assertSameTenant (SEC-01)", () => {
  it("allows access within the same tenant", () => {
    expect(() => assertSameTenant("a", "a")).not.toThrow();
  });

  it("denies a cross-tenant read, e.g. an employer reading a personal space", () => {
    expect(() => assertSameTenant("employer-tenant", "personal-tenant")).toThrow(AccessDeniedError);
  });
});
