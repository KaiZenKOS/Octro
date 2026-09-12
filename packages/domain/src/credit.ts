// Extension Lending/KYC/Credit — Phase E. Une demande de pret n'est acceptee
// que si la derniere evaluation de credit (packages/credit) a conclu
// "approve" ou "approve_with_conditions" — jamais sur une hypothese.
import type { CreditDecision } from "@octro/contracts";

export class CreditNotApprovedError extends Error {
  constructor(message = "credit assessment does not approve a loan") {
    super(message);
    this.name = "CreditNotApprovedError";
  }
}

export function assertCreditApproved(decision: CreditDecision): void {
  if (decision !== "approve" && decision !== "approve_with_conditions") {
    throw new CreditNotApprovedError();
  }
}
