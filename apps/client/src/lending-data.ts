import { useCallback } from 'react';
import { API_BASE_URL, useAuth } from './auth';

export interface KycStatus {
  status: 'not_started' | 'valid' | 'invalid';
  simulated: true;
  decided_at: string | null;
}

export interface Wallet {
  id: string;
  address: string;
  network: string;
  created_at: string;
}

export interface OdooConnection {
  id: string;
  odoo_url: string;
  odoo_db: string | null;
  created_at: string;
}

export interface OdooCompany {
  id: number;
  name: string;
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

// "xrpl:XRP" (natif) ou "xrpl:RLUSD:<issuer>" (IOU simule, integration
// xrpl-lending-sim) — un pool par actif, amorce par un script d'admin.
export interface LendingAsset {
  asset_id: string;
  vault_id: string;
}

export interface LenderDeposit {
  id: string;
  asset_id: string;
  amount_drops: string;
  status: 'submitted' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface LoanPosition {
  id: string;
  loan_id: string | null;
  asset_id: string;
  principal_drops: string;
  interest_rate_hundred_thousandths: number;
  status: 'requested' | 'active' | 'repaid' | 'defaulted';
  created_at: string;
}

// Solde reel a rembourser (GET /v1/lending/loans/outstanding) — accroit
// continuement avec les interets, jamais calculable cote client.
export interface LoanOutstanding {
  total_value_outstanding: string;
  principal_outstanding: string;
  payment_remaining: number;
  next_payment_due_date: string | null;
  defaulted: boolean;
}

export interface WithdrawalRequest {
  id: string;
  asset_id: string;
  requested_amount_drops: string;
  fulfilled_amount_drops: string;
  funded_from: 'vault' | 'buffer' | 'partial';
  status: 'fulfilled' | 'partial' | 'failed';
  created_at: string;
}

export interface LendingPositions {
  deposits: LenderDeposit[];
  loans: LoanPosition[];
  withdrawals: WithdrawalRequest[];
}

// Vue "compte" (GET /v1/wallet/activity) : soldes reels et historique de
// transactions on-chain, en unites humaines directement (contrairement aux
// montants de LenderDeposit/LoanPosition/WithdrawalRequest ci-dessus, qui
// restent en unite ledger — drops pour XRP) : ne jamais les faire passer
// par toLedgerAmount/fromLedgerAmount, utiliser formatHumanAmount.
export interface AccountBalance {
  asset_id: string;
  value: string;
}

export interface AccountTransaction {
  tx_hash: string;
  tx_type: string;
  result_code: string;
  validated: boolean;
  ledger_index: number;
  occurred_at: string | null;
  delivered_amount: AccountBalance | null;
  direction: 'incoming' | 'outgoing' | 'other';
  counterparty: string | null;
  explorer_url: string;
}

// Integration MPToken (bonus) : part reelle detenue dans un vault (XLS-33
// MPToken sous le pseudo-compte du Vault, XLS-65) — croit avec le rendement
// accumule, distinct d'un solde de portefeuille classique.
export interface VaultShareBalance {
  asset_id: string;
  shares: string;
}

export interface WalletActivity {
  address: string;
  network: string;
  balances: AccountBalance[];
  transactions: AccountTransaction[];
  vault_shares: VaultShareBalance[];
}

export const NATIVE_ASSET_ID = 'xrpl:XRP';
const DROPS_PER_XRP = 1_000_000n;

// Un code lisible pour l'utilisateur ("XRP", "RLUSD") depuis un asset_id
// (convention @octro/contracts "namespace:code[:issuer]").
export function assetSymbol(assetId: string): string {
  if (assetId === NATIVE_ASSET_ID) return 'XRP';
  return assetId.split(':')[1] ?? assetId;
}

export function isNativeXrp(assetId: string): boolean {
  return assetId === NATIVE_ASSET_ID;
}

// Le champ ledger est en drops pour XRP (entier, 1 XRP = 1 000 000 drops)
// et en valeur decimale directe pour un IOU (ex. RLUSD simule) — jamais un
// flottant, arithmetique de chaine via BigInt.
export function toLedgerAmount(assetId: string, humanAmount: string): string {
  if (!isNativeXrp(assetId)) return humanAmount;
  const trimmed = humanAmount.trim();
  const [intPart, fracPart = ''] = trimmed.split('.');
  const paddedFrac = (fracPart + '000000').slice(0, 6);
  const drops = BigInt(intPart || '0') * DROPS_PER_XRP + BigInt(paddedFrac || '0');
  return drops.toString();
}

export function fromLedgerAmount(assetId: string, ledgerAmount: string): string {
  if (!isNativeXrp(assetId)) return ledgerAmount;
  const value = BigInt(ledgerAmount);
  const whole = value / DROPS_PER_XRP;
  const frac = (value % DROPS_PER_XRP).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function formatAmount(assetId: string, ledgerAmount: string): string {
  return `${fromLedgerAmount(assetId, ledgerAmount)} ${assetSymbol(assetId)}`;
}

// Pour un montant deja en unite humaine (soldes/transactions on-chain,
// GET /v1/wallet/activity) — distinct de formatAmount, qui part d'un
// montant en unite ledger (drops pour XRP).
export function formatHumanAmount(assetId: string, humanValue: string): string {
  return `${humanValue} ${assetSymbol(assetId)}`;
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
    getWallet: useCallback(async (): Promise<Wallet> => parseJsonOrThrow(await authed('/v1/wallet')), [authed]),
    getWalletActivity: useCallback(
      async (): Promise<WalletActivity> => parseJsonOrThrow(await authed('/v1/wallet/activity')),
      [authed],
    ),
    simulateKyc: useCallback(
      async (result: 'valid' | 'invalid'): Promise<KycStatus> =>
        parseJsonOrThrow(await authed('/v1/kyc/simulate', { method: 'POST', body: JSON.stringify({ result }) })),
      [authed],
    ),
    getKycStatus: useCallback(async (): Promise<KycStatus> => parseJsonOrThrow(await authed('/v1/kyc/status')), [authed]),
    // Integration Credentials + Permissioned Domains (bonus) : verifie sur
    // le ledger qu'une attestation on-chain existe, en plus du statut KYC
    // applicatif ci-dessus.
    getKycCredentialStatus: useCallback(
      async (): Promise<{ allowed: boolean; reasonCode: string }> => parseJsonOrThrow(await authed('/v1/kyc/credential')),
      [authed],
    ),
    saveOdooConnection: useCallback(
      async (odooUrl: string, odooApiKey: string): Promise<OdooConnection> =>
        parseJsonOrThrow(
          await authed('/v1/credit/odoo-connection', {
            method: 'POST',
            body: JSON.stringify({ odoo_url: odooUrl, odoo_api_key: odooApiKey }),
          }),
        ),
      [authed],
    ),
    listOdooCompanies: useCallback(
      async (odooConnectionId: string): Promise<OdooCompany[]> =>
        parseJsonOrThrow(await authed(`/v1/credit/odoo-companies?odoo_connection_id=${odooConnectionId}`)),
      [authed],
    ),
    requestCreditAssessment: useCallback(
      async (odooConnectionId: string, companyId?: number): Promise<CreditAssessment> =>
        parseJsonOrThrow(
          await authed('/v1/credit/assessment', {
            method: 'POST',
            body: JSON.stringify({ odoo_connection_id: odooConnectionId, ...(companyId !== undefined ? { company_id: companyId } : {}) }),
          }),
        ),
      [authed],
    ),
    getLatestCreditAssessment: useCallback(async (): Promise<CreditAssessment> => parseJsonOrThrow(await authed('/v1/credit/assessment')), [authed]),
    listLendingAssets: useCallback(
      async (): Promise<LendingAsset[]> => parseJsonOrThrow(await authed('/v1/lending/assets')),
      [authed],
    ),
    getLendingPositions: useCallback(
      async (): Promise<LendingPositions> => parseJsonOrThrow(await authed('/v1/lending/positions')),
      [authed],
    ),
    deposit: useCallback(
      async (assetId: string, amountDrops: string): Promise<LenderDeposit> =>
        parseJsonOrThrow(
          await authed('/v1/lending/deposit', { method: 'POST', body: JSON.stringify({ amount_drops: amountDrops, asset_id: assetId }) }),
        ),
      [authed],
    ),
    // Montant et duree sont desormais des choix explicites du borrower
    // (decision actee) — jamais implicitement le plafond recommande.
    requestLoan: useCallback(
      async (assetId: string, requestedPrincipalDrops: string, requestedTermMonths: number): Promise<LoanPosition> =>
        parseJsonOrThrow(
          await authed('/v1/lending/loan-request', {
            method: 'POST',
            body: JSON.stringify({
              asset_id: assetId,
              requested_principal_drops: requestedPrincipalDrops,
              requested_term_months: requestedTermMonths,
            }),
          }),
        ),
      [authed],
    ),
    getLoanOutstanding: useCallback(
      async (loanId: string): Promise<LoanOutstanding> =>
        parseJsonOrThrow(await authed(`/v1/lending/loans/outstanding?loan_id=${loanId}`)),
      [authed],
    ),
    // Aucun montant a fournir : le serveur relit TotalValueOutstanding
    // juste avant de soumettre, le seul montant qui fonctionne pour clore
    // un pret (voir GET /v1/lending/loans/outstanding pour l'afficher
    // avant de valider).
    repay: useCallback(
      async (loanId: string): Promise<LoanPosition> =>
        parseJsonOrThrow(await authed('/v1/lending/repay', { method: 'POST', body: JSON.stringify({ loan_id: loanId }) })),
      [authed],
    ),
    withdraw: useCallback(
      async (assetId: string, amountDrops: string): Promise<WithdrawalRequest> =>
        parseJsonOrThrow(
          await authed('/v1/lending/withdraw', { method: 'POST', body: JSON.stringify({ amount_drops: amountDrops, asset_id: assetId }) }),
        ),
      [authed],
    ),
  };
}
