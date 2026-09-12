/**
 * Ports that packages/application/ (Samet) depends on and packages/xrpl/
 * (Augustin) implements. The application never imports the xrpl SDK or
 * an adapter class directly — only these interfaces (architecture.md).
 *
 * No port here exposes signing or submission to an LLM tool (AGT-02,
 * MCP-02): every method is a plain async call behind the application's
 * own authorization and idempotency checks.
 */
import { NetworkCapabilitySnapshot, PortResult } from "./types.js";

export interface NetworkCapabilitiesPort {
  getSnapshot(): Promise<NetworkCapabilitySnapshot>;
}

export interface PaymentPort {
  sendTestPayment(params: {
    sourceSeed: string; // test-only; never accepted from an LLM tool call
    destinationAddress: string;
    amountDrops: string;
  }): Promise<PortResult<{ txHash: string }>>;
}

/**
 * Extension Lending/KYC/Credit — Phase F. Decaissement reel depuis le
 * wallet buffer de liquidite (avance de retrait quand le vault n'a pas
 * encore assez de liquidite). Deliberement distinct de PaymentPort : ce
 * dernier est explicitement le smoke test G0 (scenario_id "g0", jamais
 * relabelise pour un decaissement de production).
 */
export interface BufferDisbursementPort {
  sendPayment(params: {
    sourceSeed: string;
    destinationAddress: string;
    amountDrops: string;
  }): Promise<PortResult<{ txHash: string }>>;
}

/**
 * Lending V1 vault/broker/loan cycle (XRP-02, XRP-04, HACK-02).
 * Status as of the A1/A3 run recorded in docs/progress/augustin.md:
 * vault + deposit + broker are implemented and verified; loanSet is a
 * stub because it requires real multi-party counterparty co-signing,
 * not yet built (see "next steps").
 */
export interface LendingV1Port {
  createVault(params: {
    ownerSeed: string;
    asset: { currency: "XRP" } | { currency: string; issuer: string };
  }): Promise<PortResult<{ vaultId: string }>>;

  depositToVault(params: {
    depositorSeed: string;
    vaultId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>>;

  setLoanBroker(params: {
    ownerSeed: string;
    vaultId: string;
    debtMaximumDrops: string;
    managementFeeRate: number;
  }): Promise<PortResult<{ loanBrokerId: string }>>;

  /**
   * Verified 2026-09-12: the borrower signs normally, then the loan
   * broker owner (brokerOwnerSeed) co-signs with xrpl.js's
   * signLoanSetByCounterparty before submission.
   */
  acceptLoan(params: {
    borrowerSeed: string;
    brokerOwnerSeed: string;
    loanBrokerId: string;
    principalDrops: string;
    interestRateHundredThousandths: number; // e.g. 5000 = 5.000%, per LoanSet's InterestRate scale (max 100000)
    paymentIntervalSeconds: number; // must be >= 60
    paymentTotal: number;
    gracePeriodSeconds: number;
  }): Promise<PortResult<{ loanId: string }>>;

  repayLoan(params: {
    borrowerSeed: string;
    loanId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>>;

  withdrawFromVault(params: {
    withdrawerSeed: string;
    vaultId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>>;
}

/** Credentials + Permissioned Domains, the primary Loaded extension (LOAD-01, LOAD-03). */
export interface CredentialsAndDomainsPort {
  issueCredential(params: {
    issuerSeed: string;
    subjectAddress: string;
    credentialType: string;
  }): Promise<PortResult<{ credentialIndex: string }>>;

  acceptCredential(params: {
    subjectSeed: string;
    issuerAddress: string;
    credentialType: string;
  }): Promise<PortResult<{}>>;

  bindDomainToVault(params: {
    ownerSeed: string;
    vaultId: string;
    acceptedCredentials: Array<{ issuer: string; credentialType: string }>;
  }): Promise<PortResult<{ domainId: string }>>;

  /**
   * Returns the applicative decision separately from the ledger
   * control (chapter 29: "enforcement = application ou ledger").
   */
  evaluateDepositEligibility(params: {
    depositorAddress: string;
    vaultId: string;
  }): Promise<{
    enforcement: "application" | "ledger";
    allowed: boolean;
    reasonCode: string;
    policyVersion: string;
    expiresAt: string | null;
  }>;
}

/** P1, gated by SP0 (SPON-01). Every method must stay unavailable until SP0 passes. */
export interface SponsorshipPort {
  quoteSponsoredOperation(params: {
    beneficiaryAddress: string;
    transactionType: string;
  }): Promise<PortResult<{ maxAmountDrops: string; expiresAt: string }>>;
}

/** Wallet contract shared with Kevin's UI (WAL-01). Signature stays client-side; this
 * port only describes the shape the UI and the application agree on. */
export interface WalletInterfacePort {
  connect(): Promise<{ address: string; network: string }>;
  getAccount(): Promise<{ address: string } | null>;
  getNetwork(): Promise<{ network: string; networkId: number | null }>;
  disconnect(): Promise<void>;
  // sign() is intentionally not declared here: it lives in the
  // human-driven wallet flow, never behind an LLM-callable tool.
}

/**
 * Extension Lending/KYC/Credit — Phase E. Wallet genere a l'inscription
 * pour la custody serveur du hackathon : keypair seul, jamais fonde ici
 * (aucun Client, aucun appel faucet — voir wallet-provisioning.ts). Ceci
 * est un ecart documente vis-a-vis de WalletInterfacePort/WAL-01
 * (signature cote client) : ces wallets sont signes cote serveur pour la
 * duree du hackathon, voir docs/adr.
 */
export interface WalletProvisioningPort {
  generate(): Promise<{ address: string; seed: string }>;
}
