import type { LoanPosition } from "@octro/contracts";
import type { LoanPositionRepository } from "../../ports/loan-position-repository.js";

export class InMemoryLoanPositionRepository implements LoanPositionRepository {
  private readonly byId = new Map<string, LoanPosition>();

  async save(loan: LoanPosition): Promise<void> {
    this.byId.set(loan.id, loan);
  }

  async findByBorrowerUserId(userId: string): Promise<LoanPosition[]> {
    return [...this.byId.values()].filter((l) => l.borrower_user_id === userId);
  }

  async findById(id: string): Promise<LoanPosition | null> {
    return this.byId.get(id) ?? null;
  }
}
