import type { KycStatus, KycStatusValue } from "@octro/contracts";
import type { Pool } from "pg";
import type { KycStatusRepository } from "../../ports/kyc-status-repository.js";

interface KycStatusRow {
  id: string;
  user_id: string;
  status: KycStatusValue;
  decided_at: Date | null;
  simulated: boolean;
}

function toDTO(row: KycStatusRow): KycStatus {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    decided_at: row.decided_at ? row.decided_at.toISOString() : null,
    simulated: true,
  };
}

export class PgKycStatusRepository implements KycStatusRepository {
  constructor(private readonly pool: Pool) {}

  async save(status: KycStatus): Promise<void> {
    await this.pool.query(
      `INSERT INTO kyc_statuses (id, user_id, status, decided_at, simulated)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         decided_at = EXCLUDED.decided_at`,
      [status.id, status.user_id, status.status, status.decided_at, status.simulated],
    );
  }

  async findByUserId(userId: string): Promise<KycStatus | null> {
    const { rows } = await this.pool.query<KycStatusRow>("SELECT * FROM kyc_statuses WHERE user_id = $1", [userId]);
    return rows[0] ? toDTO(rows[0]) : null;
  }
}
