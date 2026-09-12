import { describe, expect, it } from "vitest";
import { assessCredit } from "../src/assess-credit.js";
import type { CreditAssessmentRawFinancials } from "../src/types.js";

// Jeu de donnees synthetique, coherent en partie double, suffisant pour
// exercer chaque section du pipeline (pipeline commercial, factures/AR,
// fournisseurs/AP, P&L et bilan depuis le grand livre) sans reproduire une
// vraie base Odoo. Ne verifie pas des valeurs Python de reference (aucun
// runtime Python disponible ici) : verifie la coherence structurelle et les
// invariants documentes du script source (score borne, decision valide,
// note finale toujours presente).
const ACCOUNT_TYPES: Record<number, string> = {
  1: "income",
  2: "expense_direct_cost",
  3: "expense",
  4: "asset_cash",
  5: "asset_receivable",
  6: "liability_payable",
  7: "equity",
};

function buildRawFinancials(): CreditAssessmentRawFinancials {
  return {
    company: { name: "Test SME", currency: "EUR" },
    dateFrom: "2025-01-01",
    dateTo: "2025-12-31",
    requestedMonths: 12,
    orders: [
      { name: "SO001", date_order: "2025-06-15 10:00:00", partner_id: [1, "Acme"], state: "sale", amount_total: 10000 },
      { name: "SO002", date_order: "2025-09-01 10:00:00", partner_id: [2, "Beta"], state: "sale", amount_total: 5000 },
      { name: "SO003", date_order: "2025-09-10 10:00:00", partner_id: [1, "Acme"], state: "cancel", amount_total: 2000 },
    ],
    invoices: [
      {
        name: "INV001",
        invoice_date: "2025-06-15",
        invoice_date_due: "2025-07-15",
        partner_id: [1, "Acme"],
        payment_state: "paid",
        amount_total: 8000,
        amount_residual: 0,
      },
      {
        name: "INV002",
        invoice_date: "2025-09-01",
        invoice_date_due: "2025-10-01",
        partner_id: [2, "Beta"],
        payment_state: "partial",
        amount_total: 2000,
        amount_residual: 2000,
      },
    ],
    creditNotes: [],
    vendorBills: [
      {
        name: "BILL001",
        invoice_date: "2025-06-10",
        invoice_date_due: "2025-07-10",
        partner_id: [3, "Supplier"],
        payment_state: "not_paid",
        amount_total: 1500,
        amount_residual: 1500,
      },
    ],
    moveLines: [
      { account_id: [1, "Product Sales"], balance: -10000, date: "2025-06-15" },
      { account_id: [2, "COGS"], balance: 4000, date: "2025-06-15" },
      { account_id: [3, "Opex"], balance: 3000, date: "2025-06-20" },
      { account_id: [4, "Bank"], balance: 8000, date: "2025-06-15" },
      { account_id: [5, "Accounts Receivable"], balance: 2000, date: "2025-09-01" },
      { account_id: [6, "Accounts Payable"], balance: -1500, date: "2025-06-10" },
      { account_id: [7, "Equity"], balance: -6000, date: "2025-01-01" },
    ],
    accountTypes: ACCOUNT_TYPES,
  };
}

describe("assessCredit (methodologie Odoo Credit Assessment Report)", () => {
  it("produces a bounded, internally consistent report", () => {
    const result = assessCredit(buildRawFinancials());

    expect(result.riskAssessment.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.riskAssessment.compositeScore).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "E"]).toContain(result.riskAssessment.riskGrade);
    expect(["approve", "approve_with_conditions", "decline"]).toContain(result.creditRecommendation.decision);

    // Pipeline commercial : SO001 + SO002 confirmes (15000), SO003 annule
    // exclu du chiffre d'affaires confirme.
    expect(result.financials.revenue).toMatchObject({ net_confirmed_revenue: 15000, confirmed_order_count: 2 });
    // 2 confirmees, 1 annulee -> 2/3 = 66.67 %.
    expect(result.financials.revenue).toMatchObject({ quotation_win_rate_pct: 66.67 });

    // Factures : brut 10000, aucun avoir, AR restant 2000 (INV002 partiel).
    expect(result.financials.invoicing).toMatchObject({
      gross_invoiced_revenue: 10000,
      net_invoiced_revenue: 10000,
      accounts_receivable_outstanding: 2000,
      collected_revenue: 8000,
    });

    // P&L depuis le grand livre : revenu 10000, COGS 4000, opex 3000.
    expect(result.financials.profitability_pnl).toMatchObject({
      revenue: 10000,
      cost_of_goods_sold: 4000,
      gross_profit: 6000,
      operating_expenses: 3000,
      net_income: 3000,
    });

    // La derniere note de risque (limites de la source de donnees) est
    // toujours presente, quel que soit le dossier (CMP-01-adjacent : ce
    // moteur ne pretend jamais couvrir plus que Sales+Invoicing+Accounting).
    expect(result.riskNotes.at(-1)).toMatch(/does not include external credit bureau history/);
  });

  it("declines when there is not enough trading history", () => {
    const raw = buildRawFinancials();
    raw.orders = [{ name: "SO001", date_order: "2025-12-20 10:00:00", partner_id: [1, "Acme"], state: "sale", amount_total: 500 }];
    raw.invoices = [];
    raw.vendorBills = [];
    raw.moveLines = [];

    const result = assessCredit(raw);
    expect(result.creditRecommendation.decision).toBe("decline");
    expect(result.riskNotes.some((n) => n.includes("far below what is normally required"))).toBe(true);
  });
});
