import type { LendingPoolRecord, LendingPoolRepository } from "../../ports/lending-pool-repository.js";

export class InMemoryLendingPoolRepository implements LendingPoolRepository {
  private pool: LendingPoolRecord | null = null;

  async save(pool: LendingPoolRecord): Promise<void> {
    this.pool = pool;
  }

  async get(): Promise<LendingPoolRecord | null> {
    return this.pool;
  }
}
