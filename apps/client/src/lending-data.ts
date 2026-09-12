import { useCallback } from 'react';
import { API_BASE_URL, useAuth } from './auth';

export interface KycStatus {
  status: 'not_started' | 'valid' | 'invalid';
  simulated: true;
  decided_at: string | null;
}

export interface OdooConnection {
  id: string;
  odoo_url: string;
  odoo_db: string;
  created_at: string;
}

export interface CreditAssessment {
  id: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  decision: 'approve' | 'approve_with_conditions' | 'decline';
  composite_score: number;
  max_recommended_credit_line: { amount_decimal: string; asset_id: string };
  term_months: number;
  indicative_annual_rate_pct: number;
  risk_notes: string[];
}

export interface LenderDeposit {
  id: string;
  amount_drops: string;
  status: string;
}

export interface LoanPosition {
  id: string;
  loan_id: string | null;
  principal_drops: string;
  status: string;
}

export interface WithdrawalResult {
  funded_from: 'vault' | 'buffer' | 'partial';
  requested_amount_drops: string;
  fulfilled_amount_drops: string;
  status: string;
}

async function parseJsonOrThrow(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : `HTTP ${response.status}`);
  }
  return body;
}

// Source de donnees HTTP reelle pour auth/KYC/credit/lending uniquement —
// distincte de createFixtureSource() (src/data.ts), qui continue de servir
// l'ecran previsionnel de demonstration inchange.
export function useLendingApi() {
  const { token } = useAuth();

  const authed = useCallback(
    (path: string, init: RequestInit = {}) =>
      fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
      }),
    [token],
  );

  return {
    simulateKyc: useCallback(
      async (result: 'valid' | 'invalid'): Promise<KycStatus> =>
        parseJsonOrThrow(await authed('/v1/kyc/simulate', { method: 'POST', body: JSON.stringify({ result }) })),
      [authed],
    ),
    getKycStatus: useCallback(async (): Promise<KycStatus> => parseJsonOrThrow(await authed('/v1/kyc/status')), [authed]),
    saveOdooConnection: useCallback(
      async (odooUrl: string, odooDb: string, odooApiKey: string): Promise<OdooConnection> =>
        parseJsonOrThrow(
          await authed('/v1/credit/odoo-connection', {
            method: 'POST',
            body: JSON.stringify({ odoo_url: odooUrl, odoo_db: odooDb, odoo_api_key: odooApiKey }),
          }),
        ),
      [authed],
    ),
    requestCreditAssessment: useCallback(
      async (odooConnectionId: string): Promise<CreditAssessment> =>
        parseJsonOrThrow(
          await authed('/v1/credit/assessment', { method: 'POST', body: JSON.stringify({ odoo_connection_id: odooConnectionId }) }),
        ),
      [authed],
    ),
    getLatestCreditAssessment: useCallback(async (): Promise<CreditAssessment> => parseJsonOrThrow(await authed('/v1/credit/assessment')), [authed]),
    deposit: useCallback(
      async (amountDrops: string): Promise<LenderDeposit> =>
        parseJsonOrThrow(await authed('/v1/lending/deposit', { method: 'POST', body: JSON.stringify({ amount_drops: amountDrops }) })),
      [authed],
    ),
    requestLoan: useCallback(
      async (requestedPrincipalDrops?: string): Promise<LoanPosition> =>
        parseJsonOrThrow(
          await authed('/v1/lending/loan-request', {
            method: 'POST',
            body: JSON.stringify(requestedPrincipalDrops ? { requested_principal_drops: requestedPrincipalDrops } : {}),
          }),
        ),
      [authed],
    ),
    repay: useCallback(
      async (loanId: string, amountDrops: string): Promise<LoanPosition> =>
        parseJsonOrThrow(
          await authed('/v1/lending/repay', { method: 'POST', body: JSON.stringify({ loan_id: loanId, amount_drops: amountDrops }) }),
        ),
      [authed],
    ),
    withdraw: useCallback(
      async (amountDrops: string): Promise<WithdrawalResult> =>
        parseJsonOrThrow(await authed('/v1/lending/withdraw', { method: 'POST', body: JSON.stringify({ amount_drops: amountDrops }) })),
      [authed],
    ),
  };
}
