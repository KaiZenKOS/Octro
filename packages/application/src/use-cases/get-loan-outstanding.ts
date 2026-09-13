import type { LoanOutstanding, LoanQueryPort } from "@octro/xrpl";
import { AccessDeniedError } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { LoanPositionRepository } from "../ports/loan-position-repository.js";
import { assertQueryReady } from "../xrpl-support.js";

export interface GetLoanOutstandingQuery {
  userId: string;
  loanId: string;
}

// Solde reel du pret (TotalValueOutstanding) — accroit continuement avec
// les interets, ni l'application ni le borrower ne peuvent le calculer
// sans relire le ledger. N'accepte de lire que son propre pret.
export class GetLoanOutstandingUseCase {
  constructor(
    private readonly loans: LoanPositionRepository,
    private readonly loanQuery: LoanQueryPort,
  ) {}

  async execute(query: GetLoanOutstandingQuery): Promise<LoanOutstanding> {
    const loan = await this.loans.findById(query.loanId);
    if (!loan) throw new NotFoundError("LoanPosition", query.loanId);
    if (loan.borrower_user_id !== query.userId) {
      throw new AccessDeniedError("cannot read another borrower's loan");
    }
    if (!loan.loan_id) throw new NotFoundError("LoanPosition", query.loanId);

    return assertQueryReady(await this.loanQuery.getOutstanding(loan.loan_id));
  }
}
