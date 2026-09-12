// Regles Workspace (CDC v2.2 chapitre 11, PER-03, PER-09, SEC-01).
import type { Workspace as WorkspaceDTO, WorkspaceKind } from "@octro/contracts";

export class AccessDeniedError extends Error {
  constructor(message = "cross-tenant access denied (SEC-01)") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export class InvalidWorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWorkspaceError";
  }
}

export interface CreateWorkspaceInput {
  id: string;
  ownerUserId: string;
  kind: WorkspaceKind;
  organizationId?: string;
  displayName: string;
  createdAt: string;
}

// PER-03 : la regle vit dans le domaine, pas seulement dans le schema de
// transport (packages/contracts) — un Workspace personnel n'a jamais
// d'organization_id, et l'inverse pour une organisation.
export function createWorkspace(input: CreateWorkspaceInput): WorkspaceDTO {
  if (input.kind === "personal" && input.organizationId !== undefined) {
    throw new InvalidWorkspaceError("a personal workspace must not carry an organization_id (PER-03)");
  }
  if (input.kind === "organization" && input.organizationId === undefined) {
    throw new InvalidWorkspaceError("an organization workspace requires organization_id");
  }
  return {
    id: input.id,
    tenant_id: input.id,
    kind: input.kind,
    owner_user_id: input.ownerUserId,
    ...(input.organizationId !== undefined ? { organization_id: input.organizationId } : {}),
    display_name: input.displayName,
    created_at: input.createdAt,
  };
}

// SEC-01 / PER-09 : aucune lecture ou ecriture ne traverse un Workspace sans
// que le tenant_id de la requete corresponde exactement a celui de la
// ressource. Un employeur ou un foyer n'obtient jamais d'acces implicite.
export function assertSameTenant(requestingTenantId: string, resourceTenantId: string): void {
  if (requestingTenantId !== resourceTenantId) {
    throw new AccessDeniedError();
  }
}
