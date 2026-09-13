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

/**
 * Lecture seule (aucune transaction soumise) — deliberement distinct de
 * PortResult, qui porte une TransactionEvidence pensee pour un ordre
 * soumis au ledger (chapitre 32) : fabriquer une preuve de transaction
 * pour une simple requete de solde/historique n'aurait pas de sens.
 * "unavailable" couvre toute erreur reseau/ledger (ex. compte jamais
 * active, endpoint injoignable).
 */
export type QueryResult<T> = { outcome: "ready"; data: T } | { outcome: "unavailable"; reason: string };

export interface AccountBalance {
  asset_id: string;
  value: string;
}

export interface AccountTransactionSummary {
  tx_hash: string;
  tx_type: string;
  result_code: string;
  validated: boolean;
  ledger_index: number;
  occurred_at: string | null;
  delivered_amount: AccountBalance | null;
  direction: "incoming" | "outgoing" | "other";
  counterparty: string | null;
  explorer_url: string;
}

/**
 * Vue "compte" pour le client : soldes reels (XRP + toute ligne de
 * confiance IOU non nulle) et historique de transactions on-chain — pas
 * seulement les actions applicatives deja loguees (LenderDeposit,
 * WithdrawalRequest, ...), mais tout ce que le ledger a reellement vu
 * passer sur cette adresse.
 */
export interface VaultShareBalance {
  asset_id: string;
  // Chaine decimale (deja mise a l'echelle par AssetScale du Vault, jamais
  // le MPTAmount brut) : la part de l'utilisateur dans le vault, en unite
  // du meme actif que asset_id — pas un solde de portefeuille classique,
  // mais la valeur de ses parts (MPToken XLS-33) dans le vault partage.
  shares: string;
}

export interface AccountActivityPort {
  getBalances(address: string): Promise<QueryResult<AccountBalance[]>>;
  getTransactions(address: string, limit?: number): Promise<QueryResult<AccountTransactionSummary[]>>;
  // Integration MPToken (bonus) : chaque Vault (XLS-65) represente la part
  // d'un lender par un MPToken (XLS-33) emis sous son propre pseudo-compte
  // (Vault.ShareMPTID). known_vaults vient de LendingPoolRepository (asset_id
  // + vault_id) — le port lit le ShareMPTID de chaque vault connu puis les
  // MPToken effectivement detenus par address, et ne renvoie que ceux qui
  // matchent.
  getVaultShares(
    address: string,
    knownVaults: Array<{ assetId: string; vaultId: string }>,
  ): Promise<QueryResult<VaultShareBalance[]>>;
}

export interface LoanOutstanding {
  // Chaine native (drops pour XRP, valeur decimale pour un IOU) — meme
  // convention que les champs XRPLNumber du Loan (PrincipalRequested,
  // DebtMaximum, ...). C'est EXACTEMENT ce montant, jamais un arrondi
  // manuel, qui doit etre envoye a LendingV1Port.repayLoan avec Flags=0
  // pour clore le pret (verifie en reel : tfLoanFullPayment echoue en
  // tecKILLED, voir packages/xrpl/src/lending-v1.ts).
  totalValueOutstanding: string;
  principalOutstanding: string;
  paymentRemaining: number;
  nextPaymentDueDate: string | null; // ISO
  defaulted: boolean;
}

/**
 * Lecture seule du solde reel d'un pret sur le ledger (Loan ledger entry)
 * — necessaire car TotalValueOutstanding accroit continuement avec les
 * interets ; ni l'application ni le borrower ne peuvent le calculer sans
 * relire le ledger.
 */
export interface LoanQueryPort {
  getOutstanding(loanId: string): Promise<QueryResult<LoanOutstanding>>;
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
/**
 * Montant natif attendu par VaultDeposit/VaultWithdraw/LoanPay/
 * LoanBrokerCoverDeposit : une chaine de drops pour un Vault XRP, ou l'objet
 * IssuedCurrencyAmount pour un Vault IOU (ex. RLUSD simule) — jamais de
 * conversion cote adaptateur, l'appelant fournit deja la bonne forme
 * (xrpl-lending-sim/simulate.js : amountField/toNative, verifie en reel).
 */
export type LedgerAmount = string | { currency: string; issuer: string; value: string };

export interface LendingV1Port {
  createVault(params: {
    ownerSeed: string;
    asset: { currency: "XRP" } | { currency: string; issuer: string };
  }): Promise<PortResult<{ vaultId: string }>>;

  depositToVault(params: {
    depositorSeed: string;
    vaultId: string;
    amountDrops: LedgerAmount;
  }): Promise<PortResult<{}>>;

  // LoanBrokerSet cree un nouveau LoanBroker (loanBrokerId omis) ou met a
  // jour celui existant (loanBrokerId fourni) — meme transaction pour les
  // deux, confirme par le modele xrpl.js (loanBrokerSet.ts : "creates a new
  // LoanBroker object or updates an existing one"). Sur une mise a jour,
  // reenvoyer explicitement debtMaximumDrops pour ne rien ecraser par
  // erreur, plutot que de compter sur une semantique "omis = inchange" non
  // verifiee ici.
  //
  // IMPORTANT (verifie en reel, 2026-09-13, Hackathon Devnet) :
  // managementFeeRate/coverRateMinimum/coverRateLiquidation ne sont
  // modifiables qu'A LA CREATION (loanBrokerId absent) — un LoanBrokerSet
  // de mise a jour qui inclut managementFeeRate echoue systematiquement
  // avec temINVALID, meme en renvoyant sa valeur actuelle inchangee (0).
  // Optionnels ici pour permettre a l'appelant de les omettre entierement
  // sur une mise a jour (seul DebtMaximum s'est montre modifiable apres
  // creation) — l'adaptateur ne doit alors inclure aucun de ces trois
  // champs dans la transaction, jamais les envoyer avec leur valeur
  // actuelle.
  setLoanBroker(params: {
    ownerSeed: string;
    vaultId: string;
    loanBrokerId?: string;
    debtMaximumDrops: string;
    managementFeeRate?: number;
    // XLS-66 : capital de premiere perte du broker, optionnel (garde
    // compatible avec les pools deja amorces sans Cover).
    coverRateMinimum?: number;
    coverRateLiquidation?: number;
  }): Promise<PortResult<{ loanBrokerId: string }>>;

  /**
   * LoanBrokerCoverDeposit (XLS-66) : le proprietaire du broker finance le
   * Cover (protection contre impairment/default). Verifie en reel dans
   * xrpl-lending-sim (VaultCreate -> LoanBrokerSet -> LoanBrokerCoverDeposit
   * -> VaultDeposit).
   */
  depositCover(params: {
    ownerSeed: string;
    loanBrokerId: string;
    amount: LedgerAmount;
  }): Promise<PortResult<{}>>;

  /**
   * Verified 2026-09-12: the borrower signs normally, then the loan
   * broker owner (brokerOwnerSeed) co-signs with xrpl.js's
   * signLoanSetByCounterparty before submission.
   */
  acceptLoan(params: {
    borrowerSeed: string;
    brokerOwnerSeed: string;
    loanBrokerId: string;
    // Champ XRPLNumber de LoanSet (comme DebtMaximum de LoanBrokerSet) :
    // toujours une chaine de valeur nue (drops XRP, ou valeur decimale pour
    // un IOU) — jamais l'objet {currency,issuer,value}, verifie en reel
    // dans xrpl-lending-sim (simulate.js: toNative, pas amountField).
    principalDrops: string;
    interestRateHundredThousandths: number; // e.g. 5000 = 5.000%, per LoanSet's InterestRate scale (max 100000)
    paymentIntervalSeconds: number; // must be >= 60
    paymentTotal: number;
    gracePeriodSeconds: number;
  }): Promise<PortResult<{ loanId: string }>>;

  repayLoan(params: {
    borrowerSeed: string;
    loanId: string;
    amountDrops: LedgerAmount;
  }): Promise<PortResult<{}>>;

  withdrawFromVault(params: {
    withdrawerSeed: string;
    vaultId: string;
    amountDrops: LedgerAmount;
  }): Promise<PortResult<{}>>;
}

/**
 * Mise en place d'un actif IOU (ex. RLUSD simule) pour le hackathon,
 * verifiee en reel dans xrpl-lending-sim : DefaultRipple sur l'issuer,
 * trustlines lender/borrower/buffer -> issuer, financement initial. N'a
 * aucun effet sur le chemin XRP natif.
 */
export interface IouSetupPort {
  activateDefaultRipple(params: { issuerSeed: string }): Promise<PortResult<{}>>;
  createTrustline(params: {
    holderSeed: string;
    currency: string;
    issuerAddress: string;
    limit: string;
  }): Promise<PortResult<{}>>;
  sendIouPayment(params: {
    issuerSeed: string;
    destinationAddress: string;
    currency: string;
    value: string;
  }): Promise<PortResult<{}>>;
  /**
   * Integration Sponsorship (XLS-68/69) : meme TrustSet que createTrustline,
   * mais la plateforme (sponsorSeed) prend en charge la reserve
   * additionnelle (SponsorFlags.spfSponsorReserve) plutot que le holder —
   * verifie en reel (Wallet.sign puis xrpl.js signAsSponsor). Reduit ce que
   * l'utilisateur doit lui-meme detenir en XRP pour utiliser un actif IOU
   * (ex. RLUSD simule).
   */
  createSponsoredTrustline(params: {
    holderSeed: string;
    currency: string;
    issuerAddress: string;
    limit: string;
    sponsorSeed: string;
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
