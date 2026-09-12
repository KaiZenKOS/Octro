import type { Workspace } from "@octro/contracts";

// Port de persistance (S1). L'adaptateur PostgreSQL reel arrive avec S3 ;
// packages/application/src/adapters/in-memory fournit une doublure explicite
// en attendant, jamais comptee comme preuve d'integration reseau ou DB.
export interface WorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
}
