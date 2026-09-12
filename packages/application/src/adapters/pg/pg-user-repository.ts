import type { Pool } from "pg";
import type { UserRecord, UserRepository } from "../../ports/user-repository.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  created_at: Date;
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
  };
}

// Adaptateur PostgreSQL reel (Phase C). Remplace InMemoryUserRepository dans
// composition.ts des que POSTGRES_ENABLED=true.
export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: UserRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, email, password_hash, email_verified_at, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         email_verified_at = EXCLUDED.email_verified_at`,
      [user.id, user.email, user.passwordHash, user.emailVerifiedAt, user.createdAt],
    );
  }

  async findById(id: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
    return rows[0] ? toRecord(rows[0]) : null;
  }
}
