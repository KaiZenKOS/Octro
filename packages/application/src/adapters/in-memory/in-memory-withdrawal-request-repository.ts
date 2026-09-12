import type { WithdrawalRequest } from "@octro/contracts";
import type { WithdrawalRequestRepository } from "../../ports/withdrawal-request-repository.js";

export class InMemoryWithdrawalRequestRepository implements WithdrawalRequestRepository {
  private readonly byUserId = new Map<string, WithdrawalRequest[]>();

  async save(request: WithdrawalRequest): Promise<void> {
    const list = this.byUserId.get(request.lender_user_id) ?? [];
    list.push(request);
    this.byUserId.set(request.lender_user_id, list);
  }

  async findByLenderUserId(userId: string): Promise<WithdrawalRequest[]> {
    return this.byUserId.get(userId) ?? [];
  }
}
