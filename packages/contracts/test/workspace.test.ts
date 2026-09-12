import { describe, expect, it } from "vitest";
import { WorkspaceSchema } from "../src/workspace.js";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  owner_user_id: "22222222-2222-2222-2222-222222222222",
  display_name: "Lina",
  created_at: "2026-09-12T10:00:00Z",
};

describe("WorkspaceSchema (PER-03)", () => {
  it("accepts a personal workspace without organization_id", () => {
    const result = WorkspaceSchema.safeParse({ ...base, kind: "personal" });
    expect(result.success).toBe(true);
  });

  it("rejects a personal workspace carrying an organization_id", () => {
    const result = WorkspaceSchema.safeParse({
      ...base,
      kind: "personal",
      organization_id: "33333333-3333-3333-3333-333333333333",
    });
    expect(result.success).toBe(false);
  });

  it("requires organization_id for an organization workspace", () => {
    const result = WorkspaceSchema.safeParse({ ...base, kind: "organization" });
    expect(result.success).toBe(false);
  });

  it("accepts an organization workspace with organization_id", () => {
    const result = WorkspaceSchema.safeParse({
      ...base,
      kind: "organization",
      organization_id: "33333333-3333-3333-3333-333333333333",
    });
    expect(result.success).toBe(true);
  });

  it("rejects tenant_id different from id", () => {
    const result = WorkspaceSchema.safeParse({
      ...base,
      kind: "personal",
      tenant_id: "99999999-9999-9999-9999-999999999999",
    });
    expect(result.success).toBe(false);
  });
});
