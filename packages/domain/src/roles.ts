// Roles applicatifs (CDC v2.2 chapitre 20, SEC-01). "Lecture/simulation :
// Analyst autorise. ... Approbation de termes : approbateur designe." Un
// Analyst ne peut jamais approuver, meme dans son propre Workspace.
export type Role = "owner" | "analyst" | "approver";

const APPROVAL_CAPABLE_ROLES: ReadonlySet<Role> = new Set(["owner", "approver"]);

export class ForbiddenRoleError extends Error {
  constructor(role: Role) {
    super(`role "${role}" cannot approve a plan (SEC-01)`);
    this.name = "ForbiddenRoleError";
  }
}

export function assertCanApprove(role: Role): void {
  if (!APPROVAL_CAPABLE_ROLES.has(role)) {
    throw new ForbiddenRoleError(role);
  }
}
