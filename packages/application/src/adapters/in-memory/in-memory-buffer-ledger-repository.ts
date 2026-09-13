import type { BufferLedgerEntryRecord, BufferLedgerRepository } from "../../ports/buffer-ledger-repository.js";

export class InMemoryBufferLedgerRepository implements BufferLedgerRepository {
  private readonly entries: BufferLedgerEntryRecord[] = [];

  async save(entry: BufferLedgerEntryRecord): Promise<void> {
    this.entries.push(entry);
  }

  async getCurrentBalance(assetId: string): Promise<string | null> {
    const forAsset = this.entries.filter((e) => e.assetId === assetId);
    return forAsset.length > 0 ? forAsset[forAsset.length - 1]!.balanceAfter : null;
  }

  async listByAssetId(assetId: string): Promise<BufferLedgerEntryRecord[]> {
    return this.entries.filter((e) => e.assetId === assetId).slice().reverse();
  }
}
