import type { CreditAssessmentRawFinancials } from "@octro/credit";

export interface OdooCredentials {
  odooUrl: string;
  odooDb: string;
  apiKey: string;
}

// Une seule methode grossiere qui enchaine en interne tous les appels
// External JSON-2 necessaires (res.users, res.company, sale.order,
// account.move x3, account.account, account.move.line) — garde
// l'adaptateur HTTP fin et toute la logique de score hors de lui (voir
// @octro/credit).
export interface OdooPort {
  fetchCreditInputs(params: OdooCredentials & { sinceDate: string }): Promise<CreditAssessmentRawFinancials>;
}
