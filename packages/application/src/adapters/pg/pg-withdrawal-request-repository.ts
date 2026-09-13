import type { WithdrawalFundedFrom, WithdrawalRequest } from "@octro/contracts";
import type { Pool } from "pg";
import type { WithdrawalRequestRepository } from "../../ports/withdrawal-request-repository.js";

interface WithdrawalRequestRow {
  id: string;
  lender_user_id: string;
  vault_id: string;
  asset_id: string;
  requested_amount_drops: string;
  fulfilled_amount_drops: string;
  funded_from: WithdrawalFundedFrom;
  status: "fulfilled" | "partial" | "failed";
  evidence: Record<string, unknown> | null;
  created_at: Date;
}

function toDTO(row: WithdrawalRequestRow): WithdrawalRequest {
  return {
    id: row.id,
    lender_user_id: row.lender_user_id,
    vault_id: row.vault_id,
    asset_id: row.asset_id,
    requested_amount_drops: row.requested_amount_drops,
    fulfilled_amount_drops: row.fulfilled_amount_drops,
    funded_from: row.funded_from,
    status: row.status,
    evidence: row.evidence,
    created_at: row.created_at.toISOString(),
  };
}

export class PgWithdrawalRequestRepository implements WithdrawalRequestRepository {
  constructor(private readonly pool: Pool) {}

  async save(request: WithdrawalRequest): Promise<void> {
    await this.pool.query(
      `INSERT INTO withdrawal_requests
         (id, lender_user_id, vault_id, asset_id, requested_amount_drops, fulfilled_amount_drops, funded_from, status, evidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         fulfilled_amount_drops = EXCLUDED.fulfilled_amount_drops,
         status = EXCLUDED.status,
         evidence = EXCLUDED.evidence`,
      [
        request.id,
        request.lender_user_id,
        request.vault_id,
        request.asset_id,
        request.requested_amount_drops,
        request.fulfilled_amount_drops,
        request.funded_from,
        request.status,
        request.evidence ? JSON.stringify(request.evidence) : null,
        request.created_at,
      ],
    );
  }

  async findByLenderUserId(userId: string): Promise<WithdrawalRequest[]> {
    const { rows } = await this.pool.query<WithdrawalRequestRow>(
      "SELECT * FROM withdrawal_requests WHERE lender_user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toDTO);
  }
}
