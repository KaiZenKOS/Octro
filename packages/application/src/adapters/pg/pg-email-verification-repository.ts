import type { EmailVerificationPurpose } from "@octro/contracts";
import type { Pool } from "pg";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
} from "../../ports/email-verification-repository.js";

interface EmailVerificationRow {
  id: string;
  user_id: string;
  purpose: EmailVerificationPurpose;
  code_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  attempts: number;
}

function toRecord(row: EmailVerificationRow): EmailVerificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
  };
}

export class PgEmailVerificationRepository implements EmailVerificationRepository {
  constructor(private readonly pool: Pool) {}

  async save(record: EmailVerificationRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_verifications (id, user_id, purpose, code_hash, expires_at, consumed_at, attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         consumed_at = EXCLUDED.consumed_at,
         attempts = EXCLUDED.attempts`,
      [record.id, record.userId, record.purpose, record.codeHash, record.expiresAt, record.consumedAt, record.attempts],
    );
  }

  async findLatestActiveForUser(
    userId: string,
    purpose: EmailVerificationPurpose,
  ): Promise<EmailVerificationRecord | null> {
    const { rows } = await this.pool.query<EmailVerificationRow>(
      `SELECT * FROM email_verifications
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
       ORDER BY expires_at DESC LIMIT 1`,
      [userId, purpose],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }
}
