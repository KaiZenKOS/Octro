import type { WithdrawalRequest } from "@octro/contracts";

export interface WithdrawalRequestRepository {
  save(request: WithdrawalRequest): Promise<void>;
  findByLenderUserId(userId: string): Promise<WithdrawalRequest[]>;
}
