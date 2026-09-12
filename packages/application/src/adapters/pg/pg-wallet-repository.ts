import type { Pool } from "pg";
import type { WalletRecord, WalletRepository } from "../../ports/wallet-repository.js";

interface WalletRow {
  id: string;
  user_id: string;
  address: string;
  seed_ciphertext: string;
  network: string;
  created_at: Date;
}

function toRecord(row: WalletRow): WalletRecord {
  return {
    id: row.id,
    userId: row.user_id,
    address: row.address,
    seedCiphertext: row.seed_ciphertext,
    network: row.network,
    createdAt: row.created_at,
  };
}

export class PgWalletRepository implements WalletRepository {
  constructor(private readonly pool: Pool) {}

  async save(wallet: WalletRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO wallets (id, user_id, address, seed_ciphertext, network, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [wallet.id, wallet.userId, wallet.address, wallet.seedCiphertext, wallet.network, wallet.createdAt],
    );
  }

  async findByUserId(userId: string): Promise<WalletRecord | null> {
    const { rows } = await this.pool.query<WalletRow>("SELECT * FROM wallets WHERE user_id = $1", [userId]);
    return rows[0] ? toRecord(rows[0]) : null;
  }
}
