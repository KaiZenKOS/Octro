// Port fidele du script de reference "Odoo Credit Assessment Report"
// (SME underwriting simulation) : memes regroupements de comptes, mêmes
// poids/seuils/formules. Heuristique documentee, pas un scorecard bancaire
// proprietaire — voir risk_notes dans le resultat pour ce que cette source
// de donnees seule (Sales + Invoicing + Accounting Odoo) ne peut pas
// couvrir (bureau de credit externe, dette existante hors systeme,
// valorisation de garantie, controles KYC/legaux).
import {
  agingBucket,
  clamp,
  daysBetween,
  gradeForScore,
  maxPrincipalForPayment,
  monthKey,
  monthlyPayment,
  pstdev,
  round2,
  safeDiv,
} from "./helpers.js";
import type { AccountMoveRow, CreditAssessmentRawFinancials, CreditAssessmentResult, SaleOrderRow } from "./types.js";

const CONFIRMED_ORDER_STATES = new Set(["sale", "done"]);
const PENDING_ORDER_STATES = new Set(["draft", "sent"]);
const CANCELLED_ORDER_STATES = new Set(["cancel"]);
const PAID_STATES = new Set(["paid", "in_payment", "reversed"]);

const CURRENT_ASSET_TYPES = new Set(["asset_receivable", "asset_cash", "asset_current", "asset_prepayments"]);
const NON_CURRENT_ASSET_TYPES = new Set(["asset_fixed", "asset_non_current"]);
const ASSET_TYPES = new Set([...CURRENT_ASSET_TYPES, ...NON_CURRENT_ASSET_TYPES]);
const CURRENT_LIABILITY_TYPES = new Set(["liability_payable", "liability_credit_card", "liability_current"]);
const NON_CURRENT_LIABILITY_TYPES = new Set(["liability_non_current"]);
const LIABILITY_TYPES = new Set([...CURRENT_LIABILITY_TYPES, ...NON_CURRENT_LIABILITY_TYPES]);
const EQUITY_TYPES = new Set(["equity", "equity_unaffected"]);
const INCOME_TYPES = new Set(["income", "income_other"]);
const COGS_TYPES = new Set(["expense_direct_cost"]);
const OPEX_TYPES = new Set(["expense", "expense_depreciation"]);

const REQUIRED_DSCR = 1.25;
const MIN_HISTORY_MONTHS_FOR_FULL_TRUST = 12;
const MAX_HEALTHY_DEBT_TO_EQUITY = 3.0;

function partnerName(partner: SaleOrderRow["partner_id"]): string {
  return partner ? partner[1] : "Unknown";
}

export function assessCredit(raw: CreditAssessmentRawFinancials): CreditAssessmentResult {
  const { company, dateFrom, dateTo, requestedMonths, orders, invoices, creditNotes, vendorBills, moveLines, accountTypes } =
    raw;
  const currency = company.currency;

  // 1. Pipeline commercial (sale.order).
  let grossSales = 0;
  let cancelledAmount = 0;
  let netConfirmedSales = 0;
  let pendingSales = 0;
  let confirmedCount = 0;
  let cancelledCount = 0;
  const revenueByMonth = new Map<string, number>();
  const orderDates: string[] = [];

  for (const o of orders) {
    const amount = o.amount_total;
    orderDates.push(o.date_order.slice(0, 10));
    if (CANCELLED_ORDER_STATES.has(o.state)) {
      cancelledAmount += amount;
      cancelledCount += 1;
      continue;
    }
    grossSales += amount;
    if (CONFIRMED_ORDER_STATES.has(o.state)) {
      netConfirmedSales += amount;
      confirmedCount += 1;
      const key = monthKey(o.date_order);
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
    } else if (PENDING_ORDER_STATES.has(o.state)) {
      pendingSales += amount;
    }
  }

  const winRatePct =
    confirmedCount + cancelledCount > 0 ? round2((safeDiv(confirmedCount, confirmedCount + cancelledCount) ?? 0) * 100) : null;

  // 2. Factures client (account.move, out_invoice) + anciennete AR.
  let grossInvoiced = 0;
  let accountsReceivable = 0;
  const invoiceDates: string[] = [];
  const revenueByCustomerInvoiced = new Map<string, number>();
  const customerInvoicedMonths = new Map<string, Set<string>>();
  const arAging = new Map<string, number>();

  for (const inv of invoices) {
    grossInvoiced += inv.amount_total;
    invoiceDates.push(inv.invoice_date);
    const customer = partnerName(inv.partner_id);
    revenueByCustomerInvoiced.set(customer, (revenueByCustomerInvoiced.get(customer) ?? 0) + inv.amount_total);
    const months = customerInvoicedMonths.get(customer) ?? new Set<string>();
    months.add(monthKey(inv.invoice_date));
    customerInvoicedMonths.set(customer, months);
    if (!PAID_STATES.has(inv.payment_state)) {
      accountsReceivable += inv.amount_residual;
      const due = inv.invoice_date_due ?? inv.invoice_date;
      const daysOverdue = daysBetween(due, dateTo);
      const bucket = agingBucket(daysOverdue);
      arAging.set(bucket, (arAging.get(bucket) ?? 0) + inv.amount_residual);
    }
  }

  // 3. Avoirs client (account.move, out_refund) — net du revenu et de l'AR.
  let creditNotesIssued = 0;
  for (const cn of creditNotes) {
    creditNotesIssued += cn.amount_total;
    invoiceDates.push(cn.invoice_date);
    const customer = partnerName(cn.partner_id);
    revenueByCustomerInvoiced.set(customer, (revenueByCustomerInvoiced.get(customer) ?? 0) - cn.amount_total);
    if (!PAID_STATES.has(cn.payment_state)) {
      accountsReceivable -= cn.amount_residual;
    }
  }

  // Un AR net negatif signifierait que les avoirs ouverts depassent les
  // factures ouvertes : c'est un passif, pas un "montant du negatif" —
  // on plafonne a 0 et on le signale plutot que de rapporter un taux de
  // recouvrement > 100 % en silence.
  const rawNetAr = accountsReceivable;
  const arFlooredToZero = rawNetAr < 0;
  accountsReceivable = Math.max(accountsReceivable, 0);

  const netInvoicedRevenue = grossInvoiced - creditNotesIssued;
  const collectedAmount = netInvoicedRevenue - accountsReceivable;
  const collectionRate = safeDiv(collectedAmount, netInvoicedRevenue);

  // 4. Factures fournisseur (account.move, in_invoice) + anciennete AP.
  let grossPurchases = 0;
  let accountsPayable = 0;
  const billDates: string[] = [];
  for (const bill of vendorBills) {
    grossPurchases += bill.amount_total;
    billDates.push(bill.invoice_date);
    if (!PAID_STATES.has(bill.payment_state)) {
      accountsPayable += bill.amount_residual;
    }
  }

  // 5. Couverture de donnees reelle (historique de trading reel, pas la
  // fenetre demandee).
  const allDates = [...orderDates, ...invoiceDates, ...billDates].filter(Boolean).sort();
  const firstDate = allDates[0] ?? dateTo;
  const lastDate = allDates[allDates.length - 1] ?? dateTo;
  const coverageDays = allDates.length > 0 ? daysBetween(firstDate, lastDate) + 1 : 0;
  const coverageMonths = Math.max(coverageDays / 30.44, 1 / 30.44);

  // 6. Cycle de conversion cash.
  const dso = netInvoicedRevenue && coverageDays ? round2((safeDiv(accountsReceivable, netInvoicedRevenue) ?? 0) * coverageDays) : null;
  const dpo = grossPurchases && coverageDays ? round2((safeDiv(accountsPayable, grossPurchases) ?? 0) * coverageDays) : null;
  const cashConversionCycleDays = dso !== null || dpo !== null ? round2((dso ?? 0) - (dpo ?? 0)) : null;
  const ar90PlusShare = arAging.get("overdue_90_plus") ?? 0;
  const ar90PlusSharePct = accountsReceivable ? round2((safeDiv(ar90PlusShare, accountsReceivable) ?? 0) * 100) : null;

  // 7. Tendance et volatilite (mois avec ventes confirmees).
  const sortedMonths = [...revenueByMonth.keys()].sort();
  const monthlyValues = sortedMonths.map((m) => revenueByMonth.get(m)!);
  const mid = Math.floor(sortedMonths.length / 2);
  const firstHalf = monthlyValues.slice(0, mid).reduce((a, b) => a + b, 0);
  const secondHalf = monthlyValues.slice(mid).reduce((a, b) => a + b, 0);
  const growthRate = firstHalf > 0 ? round2(((secondHalf - firstHalf) / firstHalf) * 100) : null;

  let volatilityPct: number | null = null;
  if (monthlyValues.length >= 2 && monthlyValues.reduce((a, b) => a + b, 0) > 0) {
    const meanRev = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
    volatilityPct = meanRev ? round2((pstdev(monthlyValues) / meanRev) * 100) : null;
  }

  // 8. Concentration client et recurrence du revenu (base sur le revenu
  // facture : le pipeline commercial peut legitimement etre a zero alors
  // que du cash circule reellement).
  const topCustomers = [...revenueByCustomerInvoiced.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCustomerShare =
    topCustomers.length > 0 && netInvoicedRevenue ? round2((safeDiv(topCustomers[0]![1], netInvoicedRevenue) ?? 0) * 100) : null;

  const recurringCustomers = [...customerInvoicedMonths.entries()].filter(([, months]) => months.size >= 2).map(([c]) => c);
  const recurringRevenue = recurringCustomers.reduce((sum, c) => sum + (revenueByCustomerInvoiced.get(c) ?? 0), 0);
  const recurringRevenueSharePct = netInvoicedRevenue ? round2((safeDiv(recurringRevenue, netInvoicedRevenue) ?? 0) * 100) : null;

  // 9. Chiffres de base pour le dimensionnement du credit — ancres sur le
  // revenu facture net (post avoirs), pas sur le revenu confirme du
  // pipeline commercial.
  const monthlyInvoicedRevenueActual = netInvoicedRevenue / coverageMonths;
  const monthlyFreeCashFlow = collectedAmount / coverageMonths;
  const annualizedRevenueRunRate = monthlyInvoicedRevenueActual * 12;

  // 10. Compte de resultat, depuis le grand livre, pour la periode
  // demandee. Comptes debiteurs (charges) : solde tel quel ; comptes
  // crediteurs (produits) : signe inverse pour un chiffre positif.
  const pnlLines = moveLines.filter((l) => l.date >= dateFrom && l.date <= dateTo);
  const revenueGl = -pnlLines.filter((l) => INCOME_TYPES.has(accountTypes[l.account_id[0]] ?? "")).reduce((s, l) => s + l.balance, 0);
  const cogsGl = pnlLines.filter((l) => COGS_TYPES.has(accountTypes[l.account_id[0]] ?? "")).reduce((s, l) => s + l.balance, 0);
  const opexGl = pnlLines.filter((l) => OPEX_TYPES.has(accountTypes[l.account_id[0]] ?? "")).reduce((s, l) => s + l.balance, 0);
  const grossProfitGl = revenueGl - cogsGl;
  const netIncomeGl = revenueGl - cogsGl - opexGl;
  const grossMarginPct = revenueGl ? round2((safeDiv(grossProfitGl, revenueGl) ?? 0) * 100) : null;
  const netMarginPct = revenueGl ? round2((safeDiv(netIncomeGl, revenueGl) ?? 0) * 100) : null;
  const revenueGlVsInvoicedDiffPct = netInvoicedRevenue
    ? round2((safeDiv(revenueGl - netInvoicedRevenue, netInvoicedRevenue) ?? 0) * 100)
    : null;

  // 11. Bilan, depuis le grand livre, a la date dateTo (cumulatif depuis
  // l'origine). Fonds propres nets du resultat de la periode en cours
  // (Odoo ne cloture le P&L dans les fonds propres qu'a la fin d'exercice).
  function typeBalance(types: Set<string>, flip: boolean): number {
    const total = moveLines.filter((l) => types.has(accountTypes[l.account_id[0]] ?? "")).reduce((s, l) => s + l.balance, 0);
    return flip ? -total : total;
  }

  const totalAssets = typeBalance(ASSET_TYPES, false);
  const currentAssets = typeBalance(CURRENT_ASSET_TYPES, false);
  const cashAndBank = typeBalance(new Set(["asset_cash"]), false);
  const accountsReceivableGl = typeBalance(new Set(["asset_receivable"]), false);
  const totalLiabilities = typeBalance(LIABILITY_TYPES, true);
  const currentLiabilities = typeBalance(CURRENT_LIABILITY_TYPES, true);
  const accountsPayableGl = typeBalance(new Set(["liability_payable"]), true);
  const existingLongTermDebt = typeBalance(NON_CURRENT_LIABILITY_TYPES, true);
  const equityGl = typeBalance(EQUITY_TYPES, true);
  const totalEquity = equityGl + netIncomeGl;

  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = safeDiv(currentAssets, currentLiabilities);
  const quickRatio = safeDiv(cashAndBank + accountsReceivableGl, currentLiabilities);
  const debtToEquity = totalEquity && totalEquity > 0 ? safeDiv(totalLiabilities, totalEquity) : null;
  const negativeEquity = totalEquity !== null && totalEquity <= 0;

  // 12. Score de risque composite (0-100), sept composantes ponderees.
  let revenueScaleScore: number;
  if (annualizedRevenueRunRate >= 1_000_000) revenueScaleScore = 100;
  else if (annualizedRevenueRunRate >= 200_000) revenueScaleScore = 80;
  else if (annualizedRevenueRunRate >= 50_000) revenueScaleScore = 60;
  else if (annualizedRevenueRunRate >= 10_000) revenueScaleScore = 40;
  else revenueScaleScore = 20;

  let profitabilityScore: number;
  if (netMarginPct === null) profitabilityScore = 30;
  else if (netMarginPct >= 15) profitabilityScore = 100;
  else if (netMarginPct >= 8) profitabilityScore = 80;
  else if (netMarginPct >= 3) profitabilityScore = 60;
  else if (netMarginPct >= 0) profitabilityScore = 40;
  else profitabilityScore = 10;

  const growthComponent = clamp((growthRate ?? 0) * 0.5, -30, 30);
  const volatilityPenalty = clamp((volatilityPct ?? 0) * 0.3, 0, 40);
  const growthStabilityScore = clamp(50 + growthComponent - volatilityPenalty, 0, 100);

  const collectionComponent = (collectionRate ?? 0) * 100;
  const dsoPenalty = dso === null ? 0 : dso > 90 ? 30 : dso > 60 ? 15 : 0;
  const agingPenalty = clamp((ar90PlusSharePct ?? 0) * 0.4, 0, 30);
  const liquidityScore = clamp(collectionComponent - dsoPenalty - agingPenalty, 0, 100);

  let currentRatioScore: number;
  if (currentRatio === null) currentRatioScore = 50;
  else if (currentRatio >= 2) currentRatioScore = 100;
  else if (currentRatio >= 1.5) currentRatioScore = 80;
  else if (currentRatio >= 1.0) currentRatioScore = 60;
  else if (currentRatio >= 0.75) currentRatioScore = 40;
  else currentRatioScore = 10;

  let leverageScore: number;
  if (negativeEquity) leverageScore = 0;
  else if (debtToEquity === null) leverageScore = 50;
  else if (debtToEquity <= 0.5) leverageScore = 100;
  else if (debtToEquity <= 1) leverageScore = 80;
  else if (debtToEquity <= 2) leverageScore = 60;
  else if (debtToEquity <= MAX_HEALTHY_DEBT_TO_EQUITY) leverageScore = 30;
  else leverageScore = 10;
  const balanceSheetScore = (currentRatioScore + leverageScore) / 2;

  const concentrationScore = clamp(100 - (topCustomerShare ?? 0), 0, 100);
  const historyScore = clamp((coverageMonths / MIN_HISTORY_MONTHS_FOR_FULL_TRUST) * 100, 0, 100);

  const weights: Record<string, number> = {
    revenue_scale: 0.1,
    profitability: 0.15,
    growth_stability: 0.15,
    liquidity_collections: 0.2,
    balance_sheet_health: 0.15,
    customer_concentration: 0.15,
    operating_history: 0.1,
  };
  const scores: Record<string, number> = {
    revenue_scale: revenueScaleScore,
    profitability: profitabilityScore,
    growth_stability: growthStabilityScore,
    liquidity_collections: liquidityScore,
    balance_sheet_health: balanceSheetScore,
    customer_concentration: concentrationScore,
    operating_history: historyScore,
  };
  const compositeScore = round2(Object.keys(weights).reduce((sum, k) => sum + scores[k]! * weights[k]!, 0))!;

  const { grade, label: gradeLabel, cfMultiplier, revCapPct, termMonths, annualRatePct } = gradeForScore(compositeScore);

  // 13. Dimensionnement de la ligne de credit : plafonds independants, le
  // plus strict gagne.
  const cashFlowBasedCapacity = monthlyFreeCashFlow * cfMultiplier;
  const revenueBasedCap = annualizedRevenueRunRate * revCapPct;

  const targetMonthlyPayment = monthlyFreeCashFlow / REQUIRED_DSCR;
  const dscrBasedCapacity = termMonths ? maxPrincipalForPayment(targetMonthlyPayment, annualRatePct, termMonths) : 0;

  // Reduction "startup" : mise a l'echelle lineaire tant que sous le seuil
  // de pleine confiance.
  const startupDiscount = clamp(coverageMonths / MIN_HISTORY_MONTHS_FOR_FULL_TRUST, 0, 1);

  const candidates = [cashFlowBasedCapacity, revenueBasedCap, dscrBasedCapacity];
  const rawMaxCredit = grade !== "E" ? Math.min(...candidates) : 0;
  let maxRecommendedCreditLine = round2(rawMaxCredit * startupDiscount)!;

  // Override de levier : un bilan deja sur-endette ou insolvable ne doit
  // pas recevoir plus de credit non garanti, quels que soient les autres
  // plafonds.
  const overLeveraged = debtToEquity !== null && debtToEquity > MAX_HEALTHY_DEBT_TO_EQUITY;
  if (negativeEquity || overLeveraged) {
    maxRecommendedCreditLine = round2(Math.min(maxRecommendedCreditLine, cashFlowBasedCapacity * 0.25))!;
  }

  const proposedPayment = monthlyPayment(maxRecommendedCreditLine, annualRatePct, termMonths);
  const achievedDscr = proposedPayment ? round2(monthlyFreeCashFlow / proposedPayment) : null;

  // 14. Decision et notes.
  const insufficientHistory = coverageMonths < 3;
  const noCreditworthyAmount = maxRecommendedCreditLine <= 0;
  let decision: CreditAssessmentResult["creditRecommendation"]["decision"];
  if (grade === "E" || insufficientHistory || noCreditworthyAmount || negativeEquity) {
    decision = "decline";
  } else if (coverageMonths < 6 || overLeveraged) {
    decision = "approve_with_conditions";
  } else if (grade === "C" || grade === "D") {
    decision = "approve_with_conditions";
  } else {
    decision = "approve";
  }

  const riskNotes: string[] = [];
  if (arFlooredToZero) {
    riskNotes.push(
      `Open credit notes (${round2(creditNotesIssued)} ${currency}) exceed open invoices, which would make net receivables negative (${round2(rawNetAr)}); outstanding receivables were floored to 0 rather than reported as negative. Review whether these credit notes are genuinely linked to this period's invoices.`,
    );
  }
  if (quickRatio !== null && quickRatio < 0) {
    riskNotes.push(
      `Quick ratio is negative because the general ledger's Accounts Receivable balance is negative (${round2(accountsReceivableGl)} ${currency}) - likely a reconciliation timing artifact in the data rather than a real cash shortfall; verify the general ledger before relying on this ratio.`,
    );
  }
  if (negativeEquity) {
    riskNotes.push(
      `Balance sheet shows negative or zero equity (${round2(totalEquity)} ${currency}) once the current period's P&L is included: on paper the company's liabilities exceed its assets.`,
    );
  }
  if (overLeveraged) {
    riskNotes.push(
      `Debt-to-equity ratio of ${round2(debtToEquity)}x exceeds the ${MAX_HEALTHY_DEBT_TO_EQUITY}x threshold considered healthy for unsecured lending; the recommended amount was capped further.`,
    );
  }
  if (noCreditworthyAmount && !insufficientHistory && grade !== "E" && !negativeEquity) {
    riskNotes.push(
      "One of the sizing caps (cash-flow, revenue-based, or DSCR-based) resolved to zero, so no credit line can be recommended even though the risk grade would otherwise support one.",
    );
  }
  if (insufficientHistory) {
    riskNotes.push(
      `Only ${coverageDays} day(s) of real trading history found (${firstDate} to ${lastDate}); far below what is normally required to size a credit line reliably. Treat all figures below as directional only and request bank statements / audited financials covering a longer period.`,
    );
  } else if (coverageMonths < MIN_HISTORY_MONTHS_FOR_FULL_TRUST) {
    riskNotes.push(
      `Operating history covers only ${coverageMonths.toFixed(1)} of the ${requestedMonths} months requested; a start-up discount has been applied to the recommended credit line.`,
    );
  }
  if (netMarginPct !== null && netMarginPct < 0) {
    riskNotes.push(`The business is loss-making for the period (net margin ${netMarginPct}%).`);
  }
  if (topCustomerShare && topCustomerShare > 40) {
    riskNotes.push(
      `High customer concentration: '${topCustomers[0]![0]}' represents ${topCustomerShare}% of invoiced revenue. Loss of this customer would materially impair repayment capacity.`,
    );
  }
  if (collectionRate !== null && collectionRate < 0.7) {
    riskNotes.push(
      `Weak collections: only ${round2(collectionRate * 100)}% of invoiced revenue has been collected (DSO ~${dso} days). Cash conversion cycle is a concern for debt service.`,
    );
  }
  if (ar90PlusSharePct && ar90PlusSharePct > 20) {
    riskNotes.push(`${ar90PlusSharePct}% of outstanding receivables are more than 90 days overdue.`);
  }
  if (growthRate !== null && growthRate < 0) {
    riskNotes.push("Revenue trend is declining between the two halves of the observed period.");
  }
  if (volatilityPct !== null && volatilityPct > 50) {
    riskNotes.push(`High month-to-month revenue volatility (${volatilityPct}%), indicating unstable cash flow.`);
  }
  if (winRatePct !== null && winRatePct < 40) {
    riskNotes.push(`Low quotation win rate (${winRatePct}%): a large share of sales opportunities are lost.`);
  }
  if (revenueGlVsInvoicedDiffPct !== null && Math.abs(revenueGlVsInvoicedDiffPct) > 15) {
    riskNotes.push(
      "General ledger revenue diverges from invoiced revenue by more than 15% for the period (manual journal entries or an incomplete chart-of-accounts mapping may be involved) - the profitability figures should be reviewed manually.",
    );
  }
  if (achievedDscr !== null && achievedDscr < REQUIRED_DSCR) {
    riskNotes.push(
      `Proposed facility does not clear the ${REQUIRED_DSCR}x DSCR requirement at sizing time (achieved ${achievedDscr}x) — amount was capped accordingly.`,
    );
  }
  riskNotes.push(
    "This assessment is based solely on data recorded in Odoo (Sales + Invoicing + Accounting). It does not include external credit bureau history, existing debt held outside this system, collateral valuation, or KYC/legal checks - all of which a real credit decision would require.",
  );

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      company: company.name,
      currency,
      requestedPeriod: { from: dateFrom, to: dateTo, months: requestedMonths },
      actualDataCoverage: {
        firstRecordDate: firstDate,
        lastRecordDate: lastDate,
        coverageDays,
        coverageMonths: round2(coverageMonths)!,
      },
    },
    financials: {
      revenue: {
        gross_sales_pipeline: round2(grossSales),
        cancelled_orders_amount: round2(cancelledAmount),
        net_confirmed_revenue: round2(netConfirmedSales),
        pending_unconfirmed_orders: round2(pendingSales),
        average_confirmed_order_value: confirmedCount ? round2(netConfirmedSales / confirmedCount) : null,
        confirmed_order_count: confirmedCount,
        quotation_win_rate_pct: winRatePct,
      },
      invoicing: {
        gross_invoiced_revenue: round2(grossInvoiced),
        credit_notes_issued: round2(creditNotesIssued),
        net_invoiced_revenue: round2(netInvoicedRevenue),
        accounts_receivable_outstanding: round2(accountsReceivable),
        collected_revenue: round2(collectedAmount),
        collection_rate_pct: collectionRate !== null ? round2(collectionRate * 100) : null,
        invoiced_customers_count: revenueByCustomerInvoiced.size,
        top_customer_invoiced_share_pct: topCustomerShare,
        recurring_revenue_share_pct: recurringRevenueSharePct,
      },
      profitability_pnl: {
        revenue: round2(revenueGl),
        cost_of_goods_sold: round2(cogsGl),
        gross_profit: round2(grossProfitGl),
        gross_margin_pct: grossMarginPct,
        operating_expenses: round2(opexGl),
        net_income: round2(netIncomeGl),
        net_margin_pct: netMarginPct,
        gl_vs_invoiced_revenue_diff_pct: revenueGlVsInvoicedDiffPct,
      },
      balance_sheet: {
        total_assets: round2(totalAssets),
        current_assets: round2(currentAssets),
        cash_and_bank: round2(cashAndBank),
        accounts_receivable_gl: round2(accountsReceivableGl),
        total_liabilities: round2(totalLiabilities),
        current_liabilities: round2(currentLiabilities),
        accounts_payable_gl: round2(accountsPayableGl),
        existing_long_term_debt: round2(existingLongTermDebt),
        total_equity_incl_current_period_result: round2(totalEquity),
        working_capital: round2(workingCapital),
        current_ratio: round2(currentRatio),
        quick_ratio: round2(quickRatio),
        debt_to_equity: round2(debtToEquity),
      },
      cash_conversion: {
        days_sales_outstanding: dso,
        days_payable_outstanding: dpo,
        cash_conversion_cycle_days: cashConversionCycleDays,
        accounts_receivable_aging: Object.fromEntries([...arAging.entries()].map(([k, v]) => [k, round2(v)])),
        accounts_receivable_90_plus_share_pct: ar90PlusSharePct,
      },
      trend: {
        monthly_average_invoiced_revenue: round2(monthlyInvoicedRevenueActual),
        monthly_free_cash_flow: round2(monthlyFreeCashFlow),
        annualized_revenue_run_rate: round2(annualizedRevenueRunRate),
        revenue_growth_pct_first_vs_second_half: growthRate,
        revenue_volatility_pct: volatilityPct,
      },
    },
    riskAssessment: {
      methodology:
        "Weighted composite of 7 components (revenue scale 10%, profitability 15%, growth & stability 15%, " +
        "liquidity/collections 20%, balance sheet health 15%, customer concentration 15%, operating history 10%), " +
        "each scored 0-100, mapped to a letter grade that drives the credit sizing multipliers below.",
      componentScores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, round2(v)!])),
      compositeScore,
      riskGrade: grade,
      riskGradeLabel: gradeLabel,
    },
    creditRecommendation: {
      methodology:
        `Three independent caps are computed and the tightest one wins: (1) cash-flow capacity = monthly free ` +
        `cash flow x grade multiplier (${cfMultiplier}x for grade ${grade}); (2) revenue-based cap = annualized ` +
        `revenue run-rate x ${(revCapPct * 100).toFixed(0)}% (grade cap); (3) DSCR-based capacity = largest loan ` +
        `whose payment still clears a ${REQUIRED_DSCR}x DSCR over a ${termMonths}-month term at an indicative ` +
        `${annualRatePct}% annual rate. The result is scaled by a start-up discount (coverage_months / 12, capped ` +
        `at 1), then further capped at 25% of cash-flow capacity if the balance sheet is insolvent or exceeds a ` +
        `${MAX_HEALTHY_DEBT_TO_EQUITY}x debt-to-equity ratio.`,
      cashFlowBasedCapacity: round2(cashFlowBasedCapacity)!,
      revenueBasedCap: round2(revenueBasedCap)!,
      dscrBasedCapacity: round2(dscrBasedCapacity)!,
      startupDiscountFactor: round2(startupDiscount)!,
      maxRecommendedCreditLine,
      suggestedTermMonths: termMonths,
      suggestedIndicativeAnnualRatePct: annualRatePct,
      requiredDscr: REQUIRED_DSCR,
      estimatedMonthlyPaymentAtMax: round2(proposedPayment)!,
      achievedDscrAtMax: achievedDscr,
      decision,
    },
    monthlyRevenue: sortedMonths.map((m) => ({ month: m, netConfirmedRevenue: round2(revenueByMonth.get(m)!)! })),
    topCustomers: topCustomers.map(([name, amount]) => ({ customer: name, invoicedRevenue: round2(amount)! })),
    riskNotes,
  };
}

export type { AccountMoveRow };
