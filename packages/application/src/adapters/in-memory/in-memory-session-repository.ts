import type { SessionRecord, SessionRepository } from "../../ports/session-repository.js";

// Doublure explicite (Phase A), remplacee par l'adaptateur PostgreSQL en
// Phase C. Ne conserve rien entre deux processus.
export class InMemorySessionRepository implements SessionRepository {
  private readonly byTokenHash = new Map<string, SessionRecord>();

  async save(session: SessionRecord): Promise<void> {
    this.byTokenHash.set(session.tokenHash, session);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.byTokenHash.get(tokenHash) ?? null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.byTokenHash.delete(tokenHash);
  }
}
