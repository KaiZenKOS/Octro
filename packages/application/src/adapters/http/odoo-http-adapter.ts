import type { AccountMoveLineRow, AccountMoveRow, CreditAssessmentRawFinancials, SaleOrderRow } from "@octro/credit";
import { OdooRequestFailedError } from "../../errors.js";
import type { OdooCompany, OdooCredentials, OdooPort } from "../../ports/odoo-port.js";

async function rpc<T>(
  baseUrl: string,
  apiKey: string,
  database: string | null | undefined,
  model: string,
  method: string,
  payload: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/json/2/${model}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(database ? { "X-Odoo-Database": database } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new OdooRequestFailedError(503, `request ${model}/${method} could not reach the Odoo instance`);
  }
  if (!response.ok) {
    const rawBody = await response.text();
    let detail = `request ${model}/${method} rejected`;
    try {
      const parsed = JSON.parse(rawBody) as { message?: unknown };
      if (typeof parsed.message === "string") detail = `${model}/${method}: ${parsed.message}`;
    } catch {
      // Do not reflect arbitrary upstream HTML or stack traces.
    }
    throw new OdooRequestFailedError(response.status, detail);
  }
  return (await response.json()) as T;
}

async function resolveAccessibleCompanies(
  odooUrl: string,
  apiKey: string,
  odooDb: string | null | undefined,
): Promise<{ companies: OdooCompany[]; defaultCompanyId: number }> {
  const call = <T>(model: string, method: string, payload: unknown) =>
    rpc<T>(odooUrl, apiKey, odooDb, model, method, payload);
  const context = await call<{ uid: number }>("res.users", "context_get", {});
  const [user] = await call<Array<{ company_id: [number, string]; company_ids: number[] }>>(
    "res.users",
    "read",
    { ids: [context.uid], fields: ["company_id", "company_ids"] },
  );
  if (!user) throw new OdooRequestFailedError(404, "authenticated Odoo user was not found");
  const rows = await call<Array<{ id: number; name: string }>>("res.company", "read", {
    ids: user.company_ids,
    fields: ["name"],
  });
  return {
    companies: rows.map((row) => ({ id: row.id, name: row.name })),
    defaultCompanyId: user.company_id[0],
  };
}

// Adaptateur reel de l'API Odoo External JSON-2 (BYO, decision actee).
// Enchaine les appels necessaires puis normalise le resultat en
// CreditAssessmentRawFinancials pour @octro/credit — aucune logique de
// score ici.
export class OdooHttpAdapter implements OdooPort {
  async listCompanies(params: OdooCredentials): Promise<OdooCompany[]> {
    return (await resolveAccessibleCompanies(params.odooUrl, params.apiKey, params.odooDb)).companies;
  }

  async fetchCreditInputs(
    params: OdooCredentials & { sinceDate: string; companyId?: number },
  ): Promise<CreditAssessmentRawFinancials> {
    const { odooUrl, odooDb, apiKey, sinceDate } = params;
    const call = <T>(model: string, method: string, payload: unknown) => rpc<T>(odooUrl, apiKey, odooDb, model, method, payload);

    const accessible = await resolveAccessibleCompanies(odooUrl, apiKey, odooDb);
    const companyId = params.companyId ?? accessible.defaultCompanyId;
    if (!accessible.companies.some((company) => company.id === companyId)) {
      throw new OdooRequestFailedError(403, "selected company is not accessible with this API key");
    }

    const [companyRow] = await call<Array<{ name: string; currency_id: [number, string] }>>("res.company", "read", {
      ids: [companyId],
      fields: ["name", "currency_id"],
    });
    if (!companyRow) throw new OdooRequestFailedError(404, "selected Odoo company was not found");

    const dateTo = new Date().toISOString().slice(0, 10);

    const orders = await call<SaleOrderRow[]>("sale.order", "search_read", {
      domain: [
        ["date_order", ">=", sinceDate],
        ["company_id", "=", companyId],
      ],
      fields: ["name", "date_order", "partner_id", "state", "amount_total"],
    }).catch((error: unknown) => {
      if (error instanceof OdooRequestFailedError && error.odooStatus === 404) return [];
      throw error;
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
