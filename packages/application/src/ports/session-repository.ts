// Session opaque (jeton Bearer). Seul le hash du jeton est stocke — voir
// security/token-hash.ts ; le jeton en clair n'est renvoye qu'une fois, a la
// connexion (use-cases/login.ts), jamais relu ensuite.
export interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionRepository {
  save(session: SessionRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
