import type { CreditAssessmentRawFinancials } from "@octro/credit";

export interface OdooCredentials {
  odooUrl: string;
  // Optionnel : un Odoo on-premise mono-base n'en a pas besoin (verifie en
  // reel — l'omettre fonctionne, un nom errone fait 404). Reste utile pour
  // un futur SaaS multi-base.
  odooDb?: string | null;
  apiKey: string;
}

export interface OdooCompany {
  id: number;
  name: string;
}

// Une seule methode grossiere qui enchaine en interne tous les appels
// External JSON-2 necessaires (res.users, res.company, sale.order,
// account.move x3, account.account, account.move.line) — garde
// l'adaptateur HTTP fin et toute la logique de score hors de lui (voir
// @octro/credit).
export interface OdooPort {
  // Societes accessibles a la cle API — le client affiche un selecteur des
  // qu'il y en a plus d'une (decision actee).
  listCompanies(params: OdooCredentials): Promise<OdooCompany[]>;
  fetchCreditInputs(params: OdooCredentials & { sinceDate: string; companyId?: number }): Promise<CreditAssessmentRawFinancials>;
}
