import type { LenderDeposit } from "@octro/contracts";

export interface LenderDepositRepository {
  save(deposit: LenderDeposit): Promise<void>;
  findByUserId(userId: string): Promise<LenderDeposit[]>;
}
