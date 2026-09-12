import type { Pool } from "pg";
import type { SessionRecord, SessionRepository } from "../../ports/session-repository.js";

interface SessionRow {
  token_hash: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
}

function toRecord(row: SessionRow): SessionRecord {
  return { tokenHash: row.token_hash, userId: row.user_id, createdAt: row.created_at, expiresAt: row.expires_at };
}

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly pool: Pool) {}

  async save(session: SessionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [session.tokenHash, session.userId, session.createdAt, session.expiresAt],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const { rows } = await this.pool.query<SessionRow>("SELECT * FROM sessions WHERE token_hash = $1", [tokenHash]);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }
}
