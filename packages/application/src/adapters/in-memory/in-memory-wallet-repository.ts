import type { WalletRecord, WalletRepository } from "../../ports/wallet-repository.js";

export class InMemoryWalletRepository implements WalletRepository {
  private readonly byUserId = new Map<string, WalletRecord>();

  async save(wallet: WalletRecord): Promise<void> {
    this.byUserId.set(wallet.userId, wallet);
  }

  async findByUserId(userId: string): Promise<WalletRecord | null> {
    return this.byUserId.get(userId) ?? null;
  }
}
