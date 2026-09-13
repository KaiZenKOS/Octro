import type { LoanPosition } from "@octro/contracts";

export interface LoanPositionRepository {
  save(loan: LoanPosition): Promise<void>;
  findByBorrowerUserId(userId: string): Promise<LoanPosition[]>;
  findById(id: string): Promise<LoanPosition | null>;
}
