import type { Pool } from "pg";
import type { LendingPoolRecord, LendingPoolRepository } from "../../ports/lending-pool-repository.js";

interface LendingPoolRow {
  id: string;
  vault_id: string;
  loan_broker_id: string;
  owner_address: string;
  owner_seed_ciphertext: string;
  created_at: Date;
}

function toRecord(row: LendingPoolRow): LendingPoolRecord {
  return {
    id: row.id,
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
      `INSERT INTO lending_pool (id, vault_id, loan_broker_id, owner_address, owner_seed_ciphertext, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [pool.id, pool.vaultId, pool.loanBrokerId, pool.ownerAddress, pool.ownerSeedCiphertext, pool.createdAt],
    );
  }

  async get(): Promise<LendingPoolRecord | null> {
    const { rows } = await this.pool.query<LendingPoolRow>("SELECT * FROM lending_pool ORDER BY created_at ASC LIMIT 1");
    return rows[0] ? toRecord(rows[0]) : null;
  }
}
