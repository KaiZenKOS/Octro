import type { AccountMoveLineRow, AccountMoveRow, CreditAssessmentRawFinancials, SaleOrderRow } from "@octro/credit";
import type { OdooCredentials, OdooPort } from "../../ports/odoo-port.js";

async function rpc<T>(baseUrl: string, apiKey: string, database: string, model: string, method: string, payload: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}/json/2/${model}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${apiKey}`,
      "X-Odoo-Database": database,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Odoo ${model}/${method} failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as T;
}

// Adaptateur reel de l'API Odoo External JSON-2 (BYO, decision actee).
// Enchaine les appels necessaires puis normalise le resultat en
// CreditAssessmentRawFinancials pour @octro/credit — aucune logique de
// score ici.
export class OdooHttpAdapter implements OdooPort {
  async fetchCreditInputs(params: OdooCredentials & { sinceDate: string }): Promise<CreditAssessmentRawFinancials> {
    const { odooUrl, odooDb, apiKey, sinceDate } = params;
    const call = <T>(model: string, method: string, payload: unknown) => rpc<T>(odooUrl, apiKey, odooDb, model, method, payload);

    const ctx = await call<{ uid: number }>("res.users", "context_get", {});
    const [user] = await call<Array<{ company_id: [number, string]; company_ids: number[] }>>("res.users", "read", {
      ids: [ctx.uid],
      fields: ["company_id", "company_ids"],
    });
    if (!user) throw new Error("Odoo: no user found for the supplied API key");
    // BYO, execution non interactive (route HTTP, pas de terminal) : la
    // societe par defaut de l'utilisateur est utilisee, meme repli que le
    // script de reference en session non interactive.
    const companyId = user.company_id[0];

    const [companyRow] = await call<Array<{ name: string; currency_id: [number, string] }>>("res.company", "read", {
      ids: [companyId],
      fields: ["name", "currency_id"],
    });
    if (!companyRow) throw new Error("Odoo: company not found");

    const dateTo = new Date().toISOString().slice(0, 10);

    const orders = await call<SaleOrderRow[]>("sale.order", "search_read", {
      domain: [
        ["date_order", ">=", sinceDate],
        ["company_id", "=", companyId],
      ],
      fields: ["name", "date_order", "partner_id", "state", "amount_total"],
    });

    const fetchMoves = (moveType: string) =>
      call<AccountMoveRow[]>("account.move", "search_read", {
        domain: [
          ["move_type", "=", moveType],
          ["state", "=", "posted"],
          ["invoice_date", ">=", sinceDate],
          ["company_id", "=", companyId],
        ],
        fields: ["name", "invoice_date", "invoice_date_due", "partner_id", "payment_state", "amount_total", "amount_residual"],
      });

    const [invoices, creditNotes, vendorBills] = await Promise.all([
      fetchMoves("out_invoice"),
      fetchMoves("out_refund"),
      fetchMoves("in_invoice"),
    ]);

    const accounts = await call<Array<{ id: number; account_type: string }>>("account.account", "search_read", {
      domain: [["company_ids", "in", [companyId]]],
      fields: ["account_type"],
    });
    const accountTypes = Object.fromEntries(accounts.map((a) => [a.id, a.account_type]));

    const moveLines = await call<AccountMoveLineRow[]>("account.move.line", "search_read", {
      domain: [
        ["company_id", "=", companyId],
        ["parent_state", "=", "posted"],
        ["date", "<=", dateTo],
      ],
      fields: ["account_id", "balance", "date"],
    });

    const requestedMonths = Math.max(
      1,
      Math.round((new Date(dateTo).getTime() - new Date(sinceDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)),
    );

    return {
      company: { name: companyRow.name, currency: companyRow.currency_id[1] },
      dateFrom: sinceDate,
      dateTo,
      requestedMonths,
      orders,
      invoices,
      creditNotes,
      vendorBills,
      moveLines,
      accountTypes,
    };
  }
}
