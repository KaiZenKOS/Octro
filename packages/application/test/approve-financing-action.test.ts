import { describe, expect, it } from "vitest";
import { ForbiddenRoleError, NetworkCapabilityUnavailableError } from "@octro/domain";
import {
  ApproveFinancingActionUseCase,
  CreateWorkspaceUseCase,
  InMemoryWorkspaceRepository,
  StaticNetworkCapabilitiesAdapter,
  SystemClock,
  UNVERIFIED_HACKATHON_CAPABILITIES,
  UuidIdGenerator,
} from "../src/index.js";

async function setup(capabilities = UNVERIFIED_HACKATHON_CAPABILITIES) {
  const workspaces = new InMemoryWorkspaceRepository();
  const create = new CreateWorkspaceUseCase(workspaces, new SystemClock(), new UuidIdGenerator());
  const workspace = await create.execute({
    ownerUserId: "22222222-2222-2222-2222-222222222222",
    kind: "personal",
    displayName: "Lina",
  });
  const approve = new ApproveFinancingActionUseCase(workspaces, new StaticNetworkCapabilitiesAdapter(capabilities));
  return { workspace, approve };
}

describe("ApproveFinancingActionUseCase (NET-02, SEC-01)", () => {
  it("blocks financing when the network capability is unverified, per hackathon.config.json", async () => {
    const { workspace, approve } = await setup();
    await expect(
      approve.execute({
        requestingTenantId: workspace.tenant_id,
        workspaceId: workspace.id,
        approverRole: "owner",
        capability: "lending_v1",
      }),
    ).rejects.toBeInstanceOf(NetworkCapabilityUnavailableError);
  });

  it("refuses an analyst acting as approver, even with a verified capability", async () => {
    const { workspace, approve } = await setup({
      ...UNVERIFIED_HACKATHON_CAPABILITIES,
      ledger_verified: true,
      capabilities: { lending_v1: "verified" },
    });
    await expect(
      approve.execute({
        requestingTenantId: workspace.tenant_id,
        workspaceId: workspace.id,
        approverRole: "analyst",
        capability: "lending_v1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenRoleError);
  });

  it("approves once role and capability are both satisfied", async () => {
    const { workspace, approve } = await setup({
      ...UNVERIFIED_HACKATHON_CAPABILITIES,
      ledger_verified: true,
      capabilities: { lending_v1: "verified" },
    });
    await expect(
      approve.execute({
        requestingTenantId: workspace.tenant_id,
        workspaceId: workspace.id,
        approverRole: "owner",
        capability: "lending_v1",
      }),
    ).resolves.toEqual({ approved: true });
  });
});
