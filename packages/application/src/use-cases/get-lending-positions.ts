import type { LenderDeposit, LoanPosition, WithdrawalRequest } from "@octro/contracts";
import type { LenderDepositRepository } from "../ports/lender-deposit-repository.js";
import type { LoanPositionRepository } from "../ports/loan-position-repository.js";
import type { WithdrawalRequestRepository } from "../ports/withdrawal-request-repository.js";

export interface GetLendingPositionsQuery {
  userId: string;
}

export interface LendingPositionsResult {
  deposits: LenderDeposit[];
  loans: LoanPosition[];
  withdrawals: WithdrawalRequest[];
}

// Vue agregee des positions de l'utilisateur (lender et/ou borrower), toute
// classe d'actif confondue (asset_id sur chaque enregistrement) — alimente
// l'onglet "Vos positions" du client, qui n'avait jusqu'ici aucun moyen de
// relire son historique apres un rechargement de page.
export class GetLendingPositionsUseCase {
  constructor(
    private readonly deposits: LenderDepositRepository,
    private readonly loans: LoanPositionRepository,
    private readonly withdrawals: WithdrawalRequestRepository,
  ) {}

  async execute(query: GetLendingPositionsQuery): Promise<LendingPositionsResult> {
    const [deposits, loans, withdrawals] = await Promise.all([
      this.deposits.findByUserId(query.userId),
      this.loans.findByBorrowerUserId(query.userId),
      this.withdrawals.findByLenderUserId(query.userId),
    ]);
    return { deposits, loans, withdrawals };
  }
}
