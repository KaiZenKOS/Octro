import { assertCanApprove, assertFinancingCapability, assertSameTenant, type Role } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { NetworkCapabilitiesPort } from "../ports/network-capabilities-port.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";

export interface ApproveFinancingActionCommand {
  requestingTenantId: string;
  workspaceId: string;
  approverRole: Role;
  capability: string;
}

// S2 — NET-02 : seule l'approbation d'une action de financement est bloquee
// par une capacite reseau non verifiee ; GetPersonalProjectionUseCase, lui,
// ne consulte jamais NetworkCapabilitiesPort. SEC-01 : un role Analyst ne
// peut pas approuver, meme dans son propre Workspace.
export class ApproveFinancingActionUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly capabilities: NetworkCapabilitiesPort,
  ) {}

  async execute(command: ApproveFinancingActionCommand): Promise<{ approved: true }> {
    const workspace = await this.workspaces.findById(command.workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace", command.workspaceId);
    }
    assertSameTenant(command.requestingTenantId, workspace.tenant_id);
    assertCanApprove(command.approverRole);
    const capabilities = await this.capabilities.get();
    assertFinancingCapability(capabilities, command.capability);
    return { approved: true };
  }
}
