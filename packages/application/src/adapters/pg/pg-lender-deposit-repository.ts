import type { LenderDeposit, LenderDepositStatus } from "@octro/contracts";
import type { Pool } from "pg";
import type { LenderDepositRepository } from "../../ports/lender-deposit-repository.js";

interface LenderDepositRow {
  id: string;
  user_id: string;
  vault_id: string;
  asset_id: string;
  amount_drops: string;
  status: LenderDepositStatus;
  tx_evidence: Record<string, unknown> | null;
  created_at: Date;
}

function toDTO(row: LenderDepositRow): LenderDeposit {
  return {
    id: row.id,
    user_id: row.user_id,
    vault_id: row.vault_id,
    asset_id: row.asset_id,
    amount_drops: row.amount_drops,
    status: row.status,
    tx_evidence: row.tx_evidence,
    created_at: row.created_at.toISOString(),
  };
}

export class PgLenderDepositRepository implements LenderDepositRepository {
  constructor(private readonly pool: Pool) {}

  async save(deposit: LenderDeposit): Promise<void> {
    await this.pool.query(
      `INSERT INTO lender_deposits (id, user_id, vault_id, asset_id, amount_drops, status, tx_evidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, tx_evidence = EXCLUDED.tx_evidence`,
      [
        deposit.id,
        deposit.user_id,
        deposit.vault_id,
        deposit.asset_id,
        deposit.amount_drops,
        deposit.status,
        deposit.tx_evidence ? JSON.stringify(deposit.tx_evidence) : null,
        deposit.created_at,
      ],
    );
  }

  async findByUserId(userId: string): Promise<LenderDeposit[]> {
    const { rows } = await this.pool.query<LenderDepositRow>(
      "SELECT * FROM lender_deposits WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toDTO);
  }
}
