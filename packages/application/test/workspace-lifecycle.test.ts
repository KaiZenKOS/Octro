import { describe, expect, it } from "vitest";
import {
  CreateWorkspaceUseCase,
  GetWorkspaceUseCase,
  InMemoryWorkspaceRepository,
  SystemClock,
  UuidIdGenerator,
} from "../src/index.js";
import { AccessDeniedError } from "@octro/domain";
import { NotFoundError } from "../src/errors.js";

function wire() {
  const workspaces = new InMemoryWorkspaceRepository();
  const create = new CreateWorkspaceUseCase(workspaces, new SystemClock(), new UuidIdGenerator());
  const get = new GetWorkspaceUseCase(workspaces);
  return { create, get };
}

describe("CreateWorkspaceUseCase + GetWorkspaceUseCase (S2)", () => {
  it("creates a personal workspace usable without an Organization (PER-03, ACC-01)", async () => {
    const { create, get } = wire();
    const workspace = await create.execute({
      ownerUserId: "22222222-2222-2222-2222-222222222222",
      kind: "personal",
      displayName: "Lina",
    });
    expect(workspace.organization_id).toBeUndefined();

    const fetched = await get.execute({ requestingTenantId: workspace.tenant_id, workspaceId: workspace.id });
    expect(fetched).toEqual(workspace);
  });

  it("denies a cross-tenant read (SEC-01): an employer cannot read Lina's personal space", async () => {
    const { create, get } = wire();
    const lina = await create.execute({
      ownerUserId: "22222222-2222-2222-2222-222222222222",
      kind: "personal",
      displayName: "Lina",
    });
    const employerTenantId = "44444444-4444-4444-4444-444444444444";
    await expect(
      get.execute({ requestingTenantId: employerTenantId, workspaceId: lina.id }),
    ).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("raises NotFoundError for an unknown workspace", async () => {
    const { get } = wire();
    await expect(
      get.execute({ requestingTenantId: "any", workspaceId: "99999999-9999-9999-9999-999999999999" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
