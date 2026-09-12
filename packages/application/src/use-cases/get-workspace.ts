import type { Workspace } from "@octro/contracts";
import { assertSameTenant } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";

export interface GetWorkspaceQuery {
  // Le tenant effectif du demandeur, derive de son jeton (jamais du corps de
  // la requete) : c'est ce qui rend le test d'isolation SEC-01 significatif.
  requestingTenantId: string;
  workspaceId: string;
}

// S2 — SEC-01 : lire un Workspace hors de son propre tenant est refuse, quel
// que soit le role (un employeur ou un foyer n'a pas d'acces implicite,
// PER-09).
export class GetWorkspaceUseCase {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  async execute(query: GetWorkspaceQuery): Promise<Workspace> {
    const workspace = await this.workspaces.findById(query.workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace", query.workspaceId);
    }
    assertSameTenant(query.requestingTenantId, workspace.tenant_id);
    return workspace;
  }
}
