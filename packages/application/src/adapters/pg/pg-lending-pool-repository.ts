import type { Pool } from "pg";
import type { LendingPoolRecord, LendingPoolRepository } from "../../ports/lending-pool-repository.js";

interface LendingPoolRow {
  id: string;
  asset_id: string;
  vault_id: string;
  loan_broker_id: string;
  owner_address: string;
  owner_seed_ciphertext: string;
  created_at: Date;
}

function toRecord(row: LendingPoolRow): LendingPoolRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    vaultId: row.vault_id,
    loanBrokerId: row.loan_broker_id,
    ownerAddress: row.owner_address,
    ownerSeedCiphertext: row.owner_seed_ciphertext,
    createdAt: row.created_at,
  };
}

export class PgLendingPoolRepository implements LendingPoolRepository {
  constructor(private readonly pool: Pool) {}

  async save(pool: LendingPoolRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO lending_pool (id, asset_id, vault_id, loan_broker_id, owner_address, owner_seed_ciphertext, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (asset_id) DO NOTHING`,
      [pool.id, pool.assetId, pool.vaultId, pool.loanBrokerId, pool.ownerAddress, pool.ownerSeedCiphertext, pool.createdAt],
    );
  }

  async getByAssetId(assetId: string): Promise<LendingPoolRecord | null> {
    const { rows } = await this.pool.query<LendingPoolRow>("SELECT * FROM lending_pool WHERE asset_id = $1", [assetId]);
    return rows[0] ? toRecord(rows[0]) : null;
  }
}
