import type { LenderDeposit } from "@octro/contracts";
import type { LenderDepositRepository } from "../../ports/lender-deposit-repository.js";

export class InMemoryLenderDepositRepository implements LenderDepositRepository {
  private readonly byUserId = new Map<string, LenderDeposit[]>();

  async save(deposit: LenderDeposit): Promise<void> {
    const list = this.byUserId.get(deposit.user_id) ?? [];
    list.push(deposit);
    this.byUserId.set(deposit.user_id, list);
  }

  async findByUserId(userId: string): Promise<LenderDeposit[]> {
    return this.byUserId.get(userId) ?? [];
  }
}
