import type { Workspace } from "@octro/contracts";
import type { WorkspaceRepository } from "../../ports/workspace-repository.js";

// Doublure explicite (S1/S2), remplacee par l'adaptateur PostgreSQL en S3.
// Ne conserve rien entre deux processus : ne sert qu'aux tests et au
// demarrage local sans base configuree.
export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly byId = new Map<string, Workspace>();

  async save(workspace: Workspace): Promise<void> {
    this.byId.set(workspace.id, workspace);
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.byId.get(id) ?? null;
  }
}
