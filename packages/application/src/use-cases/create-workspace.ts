import type { Workspace, WorkspaceKind } from "@octro/contracts";
import { createWorkspace } from "@octro/domain";
import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";

export interface CreateWorkspaceCommand {
  ownerUserId: string;
  kind: WorkspaceKind;
  organizationId?: string;
  displayName: string;
}

// S2 — PER-03 : creer un Workspace personnel n'exige aucune Organization.
export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateWorkspaceCommand): Promise<Workspace> {
    const workspace = createWorkspace({
      id: this.ids.newId(),
      ownerUserId: command.ownerUserId,
      kind: command.kind,
      displayName: command.displayName,
      createdAt: this.clock.now().toISOString(),
      ...(command.organizationId !== undefined ? { organizationId: command.organizationId } : {}),
    });
    await this.workspaces.save(workspace);
    return workspace;
  }
}
