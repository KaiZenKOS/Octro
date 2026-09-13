import { InvalidSessionError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import { hashToken } from "../security/token-hash.js";

export interface ValidateSessionQuery {
  token: string;
}

export interface ValidatedSession {
  userId: string;
}

// Remplace le placeholder x-dev-tenant-id (apps/api/src/routes/workspaces.ts)
// pour toutes les routes ajoutees a partir de la Phase A (auth/kyc/credit/
// lending) — voir apps/api/src/auth.ts (requireSession).
export class ValidateSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(query: ValidateSessionQuery): Promise<ValidatedSession> {
    const session = await this.sessions.findByTokenHash(hashToken(query.token));
    if (!session || session.expiresAt.getTime() < this.clock.now().getTime()) {
      throw new InvalidSessionError();
    }
    return { userId: session.userId };
  }
}
