import type { BufferLedgerEntryRecord, BufferLedgerRepository } from "../../ports/buffer-ledger-repository.js";

export class InMemoryBufferLedgerRepository implements BufferLedgerRepository {
  private readonly entries: BufferLedgerEntryRecord[] = [];

  async save(entry: BufferLedgerEntryRecord): Promise<void> {
    this.entries.push(entry);
  }

  async getCurrentBalanceDrops(): Promise<bigint | null> {
    if (this.entries.length === 0) return null;
    return BigInt(this.entries[this.entries.length - 1]!.balanceAfterDrops);
  }
}
