// Formes brutes des lignes Odoo (External JSON-2 API) consommees par
// assess-credit.ts. Pas de dependance a un SDK Odoo : ce sont de simples
// formes de donnees, normalisees par l'adaptateur HTTP
// (packages/application/src/adapters/http/odoo-http-adapter.ts) avant
// d'atteindre ce module — qui reste sans I/O (meme esprit que
// services/optimizer, mais en TypeScript, cote credit).

export type OdooPartnerRef = readonly [number, string];
export type OdooPartner = OdooPartnerRef | false;

export interface SaleOrderRow {
  name: string;
  date_order: string;
  partner_id: OdooPartner;
  state: string;
  amount_total: number;
}

// account.move (out_invoice, out_refund ou in_invoice selon le tableau).
export interface AccountMoveRow {
  name: string;
  invoice_date: string;
  invoice_date_due: string | null;
  partner_id: OdooPartner;
  payment_state: string;
  amount_total: number;
  amount_residual: number;
}

export interface AccountMoveLineRow {
  account_id: OdooPartnerRef;
  balance: number;
  date: string;
}

export interface CreditAssessmentCompany {
  name: string;
  currency: string;
}

export interface CreditAssessmentRawFinancials {
  company: CreditAssessmentCompany;
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string; // "YYYY-MM-DD"
  requestedMonths: number;
  orders: SaleOrderRow[];
  invoices: AccountMoveRow[];
  creditNotes: AccountMoveRow[];
  vendorBills: AccountMoveRow[];
  moveLines: AccountMoveLineRow[]; // cumulatif jusqu'a dateTo
  accountTypes: Record<number, string>; // account_id -> account_type
}

export type CreditGrade = "A" | "B" | "C" | "D" | "E";
export type CreditDecision = "approve" | "approve_with_conditions" | "decline";

export interface CreditAssessmentResult {
  generatedAt: string;
  scope: {
    company: string;
    currency: string;
    requestedPeriod: { from: string; to: string; months: number };
    actualDataCoverage: { firstRecordDate: string; lastRecordDate: string; coverageDays: number; coverageMonths: number };
  };
  financials: Record<string, unknown>;
  riskAssessment: {
    methodology: string;
    componentScores: Record<string, number>;
    compositeScore: number;
    riskGrade: CreditGrade;
    riskGradeLabel: string;
  };
  creditRecommendation: {
    methodology: string;
    cashFlowBasedCapacity: number;
    revenueBasedCap: number;
    dscrBasedCapacity: number;
    startupDiscountFactor: number;
    maxRecommendedCreditLine: number;
    suggestedTermMonths: number;
    suggestedIndicativeAnnualRatePct: number;
    requiredDscr: number;
    estimatedMonthlyPaymentAtMax: number;
    achievedDscrAtMax: number | null;
    decision: CreditDecision;
  };
  monthlyRevenue: Array<{ month: string; netConfirmedRevenue: number }>;
  topCustomers: Array<{ customer: string; invoicedRevenue: number }>;
  riskNotes: string[];
}
