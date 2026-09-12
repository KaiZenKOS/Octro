import type { Pool } from "pg";
import type { Workspace, WorkspaceKind } from "@octro/contracts";
import type { WorkspaceRepository } from "../../ports/workspace-repository.js";

interface WorkspaceRow {
  id: string;
  tenant_id: string;
  kind: string;
  owner_user_id: string;
  organization_id: string | null;
  display_name: string;
  created_at: Date;
}

function toDTO(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    kind: row.kind as WorkspaceKind,
    owner_user_id: row.owner_user_id,
    ...(row.organization_id !== null ? { organization_id: row.organization_id } : {}),
    display_name: row.display_name,
    created_at: row.created_at.toISOString(),
  };
}

export class PgWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly pool: Pool) {}

  async save(workspace: Workspace): Promise<void> {
    await this.pool.query(
      `INSERT INTO workspaces (id, tenant_id, kind, owner_user_id, organization_id, display_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name`,
      [
        workspace.id,
        workspace.tenant_id,
        workspace.kind,
        workspace.owner_user_id,
        workspace.organization_id ?? null,
        workspace.display_name,
        new Date(workspace.created_at),
      ],
    );
  }

  async findById(id: string): Promise<Workspace | null> {
    const { rows } = await this.pool.query<WorkspaceRow>(
      "SELECT * FROM workspaces WHERE id = $1",
      [id],
    );
    return rows[0] ? toDTO(rows[0]) : null;
  }
}
