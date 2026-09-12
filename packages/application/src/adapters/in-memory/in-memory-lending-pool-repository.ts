import type { LendingPoolRecord, LendingPoolRepository } from "../../ports/lending-pool-repository.js";

export class InMemoryLendingPoolRepository implements LendingPoolRepository {
  private readonly byAssetId = new Map<string, LendingPoolRecord>();

  async save(pool: LendingPoolRecord): Promise<void> {
    this.byAssetId.set(pool.assetId, pool);
  }

  async getByAssetId(assetId: string): Promise<LendingPoolRecord | null> {
    return this.byAssetId.get(assetId) ?? null;
  }

  async listAll(): Promise<LendingPoolRecord[]> {
    return [...this.byAssetId.values()];
  }
}
