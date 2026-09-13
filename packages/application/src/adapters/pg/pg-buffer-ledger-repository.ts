import type { Pool } from "pg";
import type { BufferLedgerEntryRecord, BufferLedgerEntryType, BufferLedgerRepository } from "../../ports/buffer-ledger-repository.js";

interface BufferLedgerRow {
  id: string;
  asset_id: string;
  withdrawal_request_id: string | null;
  entry_type: BufferLedgerEntryType;
  amount_drops: string;
  balance_after_drops: string;
  tx_evidence: Record<string, unknown> | null;
  created_at: Date;
}

function toRecord(row: BufferLedgerRow): BufferLedgerEntryRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    withdrawalRequestId: row.withdrawal_request_id,
    entryType: row.entry_type,
    amount: row.amount_drops,
    balanceAfter: row.balance_after_drops,
    txEvidence: row.tx_evidence,
    createdAt: row.created_at,
  };
}

export class PgBufferLedgerRepository implements BufferLedgerRepository {
  constructor(private readonly pool: Pool) {}

  async save(entry: BufferLedgerEntryRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO buffer_ledger (id, asset_id, withdrawal_request_id, entry_type, amount_drops, balance_after_drops, tx_evidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.id,
        entry.assetId,
        entry.withdrawalRequestId,
        entry.entryType,
        entry.amount,
        entry.balanceAfter,
        entry.txEvidence ? JSON.stringify(entry.txEvidence) : null,
        entry.createdAt,
      ],
    );
  }

  async getCurrentBalance(assetId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ balance_after_drops: string }>(
      "SELECT balance_after_drops FROM buffer_ledger WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1",
      [assetId],
    );
    return rows[0] ? rows[0].balance_after_drops : null;
  }

  async listByAssetId(assetId: string): Promise<BufferLedgerEntryRecord[]> {
    const { rows } = await this.pool.query<BufferLedgerRow>(
      "SELECT * FROM buffer_ledger WHERE asset_id = $1 ORDER BY created_at DESC",
      [assetId],
    );
    return rows.map(toRecord);
  }
}
