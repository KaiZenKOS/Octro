// Racine de composition (S1 + Phase A/B/C). Cable les cas d'usage a des
// adaptateurs en memoire par defaut ; les entites Phase A/B (comptes,
// sessions, verification email, KYC) basculent sur PostgreSQL des que
// POSTGRES_ENABLED=true (voir buildPersistence ci-dessous) — la premiere
// persistance reelle du projet, S1 etait entierement en memoire
// (docs/TEAM_TASKS.md section 8 : Workspace/EconomicEvent restent en
// memoire, hors perimetre de cette migration). L'Octro Mailing System
// (MailPort) est le premier adaptateur HTTP reel cable ici, conditionne par
// MAIL_ENABLED/MAIL_API_*.
import { randomBytes } from "node:crypto";
import {
  ApproveFinancingActionUseCase,
  BootstrapLendingPoolUseCase,
  BorrowerLoanRequestUseCase,
  ConfirmEmailUseCase,
  type BufferLedgerRepository,
  type CreditAssessmentRepository,
  CreateWorkspaceUseCase,
  type CryptoPort,
  type EmailVerificationRepository,
  FakeBufferDisbursementAdapter,
  FakeLendingV1Adapter,
  GetCurrentUserUseCase,
  GetKycStatusUseCase,
  FakeAccountActivityAdapter,
  FakeIouSetupAdapter,
  FakeLoanQueryAdapter,
  GetLatestCreditAssessmentUseCase,
  GetLoanOutstandingUseCase,
  GetLendingPositionsUseCase,
  GetWalletActivityUseCase,
  GetWalletUseCase,
  ListLendingAssetsUseCase,
  GetPersonalProjectionUseCase,
  GetWorkspaceUseCase,
  InMemoryBufferLedgerRepository,
  InMemoryCreditAssessmentRepository,
  InMemoryEconomicEventRepository,
  InMemoryEmailVerificationRepository,
  InMemoryKycStatusRepository,
  InMemoryLenderDepositRepository,
  InMemoryLendingPoolRepository,
  InMemoryLoanPositionRepository,
  InMemoryOdooConnectionRepository,
  InMemorySessionRepository,
  InMemoryTxEvidenceRepository,
  InMemoryUserRepository,
  InMemoryWalletRepository,
  InMemoryWithdrawalRequestRepository,
  InMemoryWorkspaceRepository,
  createMongoClient,
  MongoTxEvidenceRepository,
  type TxEvidenceRepository,
  type KycStatusRepository,
  type LenderDepositRepository,
  LenderDepositUseCase,
  type LendingPoolRepository,
  type LoanPositionRepository,
  LoginUseCase,
  type MailPort,
  NodeAesGcmAdapter,
  OctroMailAdapter,
  type OdooConnectionRepository,
  OdooHttpAdapter,
  type OdooPort,
  PgBufferLedgerRepository,
  PgCreditAssessmentRepository,
  PgEmailVerificationRepository,
  PgKycStatusRepository,
  PgLenderDepositRepository,
  PgLendingPoolRepository,
  PgLoanPositionRepository,
  PgOdooConnectionRepository,
  PgSessionRepository,
  PgUserRepository,
  PgWalletRepository,
  PgWithdrawalRequestRepository,
  ProvisionWalletUseCase,
  RecordDeclaredEventUseCase,
  RecordingMailAdapter,
  RepayLoanUseCase,
  RequestCreditAssessmentUseCase,
  ListOdooCompaniesUseCase,
  SaveOdooConnectionUseCase,
  type SessionRepository,
  SignUpUseCase,
  FakeCredentialsAndDomainsAdapter,
  GetKycCredentialStatusUseCase,
  SimulateKycUseCase,
  SimulatedOptimizerAdapter,
  StaticNetworkCapabilitiesAdapter,
  SystemClock,
  UNVERIFIED_HACKATHON_CAPABILITIES,
  type UserRepository,
  UuidIdGenerator,
  ValidateSessionUseCase,
  type WalletRepository,
  WithdrawFromVaultUseCase,
  type WithdrawalRequestRepository,
  createPgPool,
} from "@octro/application";
import {
  type AccountActivityPort,
  type BufferDisbursementPort,
  type CredentialsAndDomainsPort,
  HACKATHON_DEVNET,
  type IouSetupPort,
  type LendingV1Port,
  type LoanQueryPort,
  type WalletProvisioningPort,
  XrplAccountActivityAdapter,
  XrplBufferDisbursementAdapter,
  XrplCredentialsAndDomainsAdapter,
  XrplIouSetupAdapter,
  XrplLendingV1Adapter,
  XrplLoanQueryAdapter,
  XrplWalletProvisioningAdapter,
} from "@octro/xrpl";

export interface AppDependencies {
  createWorkspace: CreateWorkspaceUseCase;
  getWorkspace: GetWorkspaceUseCase;
  recordDeclaredEvent: RecordDeclaredEventUseCase;
  getPersonalProjection: GetPersonalProjectionUseCase;
  approveFinancingAction: ApproveFinancingActionUseCase;
  signUp: SignUpUseCase;
  confirmEmail: ConfirmEmailUseCase;
  login: LoginUseCase;
  validateSession: ValidateSessionUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  simulateKyc: SimulateKycUseCase;
  getKycStatus: GetKycStatusUseCase;
  getKycCredentialStatus: GetKycCredentialStatusUseCase;
  saveOdooConnection: SaveOdooConnectionUseCase;
  listOdooCompanies: ListOdooCompaniesUseCase;
  requestCreditAssessment: RequestCreditAssessmentUseCase;
  getLatestCreditAssessment: GetLatestCreditAssessmentUseCase;
  listLendingAssets: ListLendingAssetsUseCase;
  getLendingPositions: GetLendingPositionsUseCase;
  getWallet: GetWalletUseCase;
  getWalletActivity: GetWalletActivityUseCase;
  lenderDeposit: LenderDepositUseCase;
  borrowerLoanRequest: BorrowerLoanRequestUseCase;
  repayLoan: RepayLoanUseCase;
  getLoanOutstanding: GetLoanOutstandingUseCase;
  withdrawFromVault: WithdrawFromVaultUseCase;
  // Pas de route HTTP publique (operation d'administration hors trafic
  // public, voir infra/scripts/bootstrap-lending-pool.mjs) — expose ici,
  // comme `mail`, uniquement pour que les tests puissent amorcer le pool
  // partage avec le FakeLendingV1Adapter sans dupliquer sa logique.
  bootstrapLendingPool: BootstrapLendingPoolUseCase;
  // Expose telle quelle (comme les autres deps) pour que les tests puissent
  // lire le dernier email "envoye" (RecordingMailAdapter) sans I/O reel.
  mail: MailPort;
  // Expose tel quel pour que les tests puissent forcer un retrait "rejected"
  // sur le FakeLendingV1Adapter (declenche le repli buffer, Phase F).
  lending: LendingV1Port;
}

// MAIL_ENABLED=true + les trois variables MAIL_API_* (voir .env.example) ->
// adaptateur reel. Sinon (tests, dev sans mail configure) -> doublure qui
// n'appelle jamais l'API reelle.
// MONGODB_ENABLED=true -> le vrai client Mongo (journal d'audit brut des
// transactions XRPL, integration xrpl-lending-sim — voir .env.example :
// "optional raw documents only; no financial balances or access decisions").
// Sinon (tests, dev sans Mongo) -> doublure en memoire, meme principe que
// buildMailPort/buildPersistence ci-dessus.
function buildTxEvidenceRepository(): TxEvidenceRepository {
  if (process.env["MONGODB_ENABLED"] === "true") {
    const client = createMongoClient({
      host: process.env["MONGODB_HOST"] ?? "",
      port: Number(process.env["MONGODB_PORT"] ?? 27017),
      database: process.env["MONGODB_DATABASE"] ?? "",
      username: process.env["MONGODB_USERNAME"] ?? "",
      password: process.env["MONGODB_PASSWORD"] ?? "",
      authSource: process.env["MONGODB_AUTH_SOURCE"] ?? "admin",
      tls: process.env["MONGODB_TLS"] === "true",
      tlsAllowInvalidCertificates: process.env["MONGODB_TLS_ALLOW_INVALID_CERTIFICATES"] === "true",
      tlsAllowInvalidHostnames: process.env["MONGODB_TLS_ALLOW_INVALID_HOSTNAMES"] === "true",
    });
    return new MongoTxEvidenceRepository(client, process.env["MONGODB_DATABASE"] ?? "");
  }
  return new InMemoryTxEvidenceRepository();
}

function buildMailPort(): MailPort {
  const baseUrl = process.env["MAIL_API_BASE_URL"];
  const sendPath = process.env["MAIL_API_SEND_PATH"];
  const token = process.env["MAIL_API_TOKEN"];
  if (process.env["MAIL_ENABLED"] === "true" && baseUrl && sendPath && token) {
    return new OctroMailAdapter(baseUrl, sendPath, token);
  }
  return new RecordingMailAdapter();
}

interface Persistence {
  users: UserRepository;
  sessions: SessionRepository;
  emailVerifications: EmailVerificationRepository;
  kycStatuses: KycStatusRepository;
  odooConnections: OdooConnectionRepository;
  creditAssessments: CreditAssessmentRepository;
  wallets: WalletRepository;
  lendingPools: LendingPoolRepository;
  lenderDeposits: LenderDepositRepository;
  loanPositions: LoanPositionRepository;
  withdrawalRequests: WithdrawalRequestRepository;
  bufferLedger: BufferLedgerRepository;
}

// Phase C : POSTGRES_ENABLED=true (deja requis par infra/config/environment.mjs)
// bascule sur les adaptateurs Pg ; sinon (tests vitest, qui ne chargent
// jamais .env — voir apps/api/test/*.test.ts) les doublures in-memory
// restent utilisees, gardant la suite de tests deterministe et sans reseau.
function buildPersistence(): Persistence {
  if (process.env["POSTGRES_ENABLED"] === "true") {
    const pool = createPgPool({
      host: process.env["PGHOST"] ?? "",
      port: Number(process.env["PGPORT"] ?? 5432),
      database: process.env["PGDATABASE"] ?? "",
      user: process.env["PGUSER"] ?? "",
      password: process.env["PGPASSWORD"] ?? "",
      sslMode: process.env["PGSSLMODE"] ?? "",
      ...(process.env["PGSSLROOTCERT"] ? { sslRootCertPath: process.env["PGSSLROOTCERT"] } : {}),
    });
    return {
      users: new PgUserRepository(pool),
      sessions: new PgSessionRepository(pool),
      emailVerifications: new PgEmailVerificationRepository(pool),
      kycStatuses: new PgKycStatusRepository(pool),
      odooConnections: new PgOdooConnectionRepository(pool),
      creditAssessments: new PgCreditAssessmentRepository(pool),
      wallets: new PgWalletRepository(pool),
      lendingPools: new PgLendingPoolRepository(pool),
      lenderDeposits: new PgLenderDepositRepository(pool),
      loanPositions: new PgLoanPositionRepository(pool),
      withdrawalRequests: new PgWithdrawalRequestRepository(pool),
      bufferLedger: new PgBufferLedgerRepository(pool),
    };
  }
  return {
    users: new InMemoryUserRepository(),
    sessions: new InMemorySessionRepository(),
    emailVerifications: new InMemoryEmailVerificationRepository(),
    kycStatuses: new InMemoryKycStatusRepository(),
    odooConnections: new InMemoryOdooConnectionRepository(),
    creditAssessments: new InMemoryCreditAssessmentRepository(),
    wallets: new InMemoryWalletRepository(),
    lendingPools: new InMemoryLendingPoolRepository(),
    lenderDeposits: new InMemoryLenderDepositRepository(),
    loanPositions: new InMemoryLoanPositionRepository(),
    withdrawalRequests: new InMemoryWithdrawalRequestRepository(),
    bufferLedger: new InMemoryBufferLedgerRepository(),
  };
}

// LENDING_V1_ENABLED=true -> le vrai adaptateur XRPL (Custom Hackathon
// Devnet). Sinon (tests, dev avant bootstrap du pool partage) ->
// FakeLendingV1Adapter, jamais un vrai appel reseau — meme principe que
// buildMailPort/buildPersistence ci-dessus.
function buildLendingV1Port(): LendingV1Port {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplLendingV1Adapter(HACKATHON_DEVNET.wss);
  }
  return new FakeLendingV1Adapter();
}

// Meme bascule que buildLendingV1Port (les deux sont des concerns XRPL
// reels/factices, actives ensemble).
function buildBufferDisbursementPort(): BufferDisbursementPort {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplBufferDisbursementAdapter(HACKATHON_DEVNET.wss);
  }
  return new FakeBufferDisbursementAdapter();
}

// Meme bascule : lecture seule (soldes + historique on-chain), jamais de
// signature — active/desactive avec le reste des concerns XRPL reels.
function buildAccountActivityPort(): AccountActivityPort {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplAccountActivityAdapter(HACKATHON_DEVNET.wss);
  }
  return new FakeAccountActivityAdapter();
}

// Meme bascule : Credentials + Permissioned Domains (LOAD-01), extension
// Loaded primaire — CredentialCreate/Accept + PermissionedDomainSet reels,
// verifies en reel sur ce devnet (voir credentials-domains.ts).
function buildCredentialsAndDomainsPort(): CredentialsAndDomainsPort {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplCredentialsAndDomainsAdapter(HACKATHON_DEVNET.wss);
  }
  return new FakeCredentialsAndDomainsAdapter();
}

// Meme bascule : etablissement automatique de trustline (TrustSet) avant un
// depot/retrait/emprunt sur un actif IOU (RLUSD simule, integration
// xrpl-lending-sim) — l'utilisateur ne doit jamais avoir a la creer
// lui-meme.
function buildIouSetupPort(): IouSetupPort {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplIouSetupAdapter(HACKATHON_DEVNET.wss);
  }
  return new FakeIouSetupAdapter();
}

// Meme bascule : lecture seule du solde reel d'un pret (TotalValueOutstanding,
// accru par les interets) — necessaire pour un remboursement exact.
function buildLoanQueryPort(): LoanQueryPort {
  if (process.env["LENDING_V1_ENABLED"] === "true") {
    return new XrplLoanQueryAdapter(HACKATHON_DEVNET.wss);
  }
  return new FakeLoanQueryAdapter();
}

// Cle reelle (env) si presente ; sinon cle ephemere generee pour ce process
// uniquement (tests, dev sans Postgres) — jamais persistee, jamais reutilisee
// au redemarrage. infra/config/environment.mjs exige la vraie cle des que
// POSTGRES_ENABLED=true, donc ce repli ne s'applique jamais a une base reelle.
function resolveEncryptionKey(envKeyName: string): string {
  return process.env[envKeyName] ?? randomBytes(32).toString("base64");
}

export function buildDependencies(): AppDependencies {
  const workspaces = new InMemoryWorkspaceRepository();
  const events = new InMemoryEconomicEventRepository();
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const optimizer = new SimulatedOptimizerAdapter();
  const capabilities = new StaticNetworkCapabilitiesAdapter(UNVERIFIED_HACKATHON_CAPABILITIES);

  const mail = buildMailPort();
  const txEvidence = buildTxEvidenceRepository();
  const {
    users,
    sessions,
    emailVerifications,
    kycStatuses,
    odooConnections,
    creditAssessments,
    wallets,
    lendingPools,
    lenderDeposits,
    loanPositions,
    withdrawalRequests,
    bufferLedger,
  } = buildPersistence();
  const odooApiKeyCrypto: CryptoPort = new NodeAesGcmAdapter(resolveEncryptionKey("ODOO_API_KEY_ENCRYPTION_KEY"));
  const walletSeedCrypto: CryptoPort = new NodeAesGcmAdapter(resolveEncryptionKey("WALLET_SEED_ENCRYPTION_KEY"));
  const odoo: OdooPort = new OdooHttpAdapter();
  const walletProvisioning: WalletProvisioningPort = new XrplWalletProvisioningAdapter();
  const lending: LendingV1Port = buildLendingV1Port();
  const bufferDisbursement: BufferDisbursementPort = buildBufferDisbursementPort();
  const accountActivity: AccountActivityPort = buildAccountActivityPort();
  const iouSetup: IouSetupPort = buildIouSetupPort();
  const loanQuery: LoanQueryPort = buildLoanQueryPort();
  const credentialsAndDomains: CredentialsAndDomainsPort = buildCredentialsAndDomainsPort();
  // Secret plateforme unique (pas par utilisateur, jamais chiffre en base —
  // il n'existe qu'une fois, fourni via l'environnement, SEC-04).
  const bufferWalletAddress = process.env["BUFFER_WALLET_ADDRESS"] ?? "";
  const bufferWalletSeed = process.env["BUFFER_WALLET_SEED"] ?? "";
  const bufferInitialBalanceDrops = process.env["BUFFER_INITIAL_BALANCE_DROPS"] ?? "1000000000";

  const provisionWallet = new ProvisionWalletUseCase(wallets, walletProvisioning, walletSeedCrypto, clock, ids);

  return {
    createWorkspace: new CreateWorkspaceUseCase(workspaces, clock, ids),
    getWorkspace: new GetWorkspaceUseCase(workspaces),
    recordDeclaredEvent: new RecordDeclaredEventUseCase(workspaces, events, clock, ids),
    getPersonalProjection: new GetPersonalProjectionUseCase(workspaces, events, optimizer, clock),
    approveFinancingAction: new ApproveFinancingActionUseCase(workspaces, capabilities),
    signUp: new SignUpUseCase(users, emailVerifications, mail, provisionWallet, clock, ids),
    confirmEmail: new ConfirmEmailUseCase(users, emailVerifications, clock),
    login: new LoginUseCase(users, sessions, clock),
    validateSession: new ValidateSessionUseCase(sessions, clock),
    getCurrentUser: new GetCurrentUserUseCase(users),
    simulateKyc: new SimulateKycUseCase(
      kycStatuses,
      wallets,
      credentialsAndDomains,
      walletSeedCrypto,
      txEvidence,
      bufferWalletAddress,
      bufferWalletSeed,
      clock,
      ids,
    ),
    getKycStatus: new GetKycStatusUseCase(kycStatuses),
    getKycCredentialStatus: new GetKycCredentialStatusUseCase(wallets, credentialsAndDomains),
    saveOdooConnection: new SaveOdooConnectionUseCase(odooConnections, kycStatuses, odooApiKeyCrypto, clock, ids),
    listOdooCompanies: new ListOdooCompaniesUseCase(odooConnections, kycStatuses, odoo, odooApiKeyCrypto),
    requestCreditAssessment: new RequestCreditAssessmentUseCase(
      odooConnections,
      creditAssessments,
      kycStatuses,
      odoo,
      odooApiKeyCrypto,
      clock,
      ids,
    ),
    getLatestCreditAssessment: new GetLatestCreditAssessmentUseCase(creditAssessments),
    listLendingAssets: new ListLendingAssetsUseCase(lendingPools),
    getLendingPositions: new GetLendingPositionsUseCase(lenderDeposits, loanPositions, withdrawalRequests),
    getWallet: new GetWalletUseCase(wallets),
    getWalletActivity: new GetWalletActivityUseCase(wallets, accountActivity, lendingPools),
    lenderDeposit: new LenderDepositUseCase(
      kycStatuses,
      wallets,
      lendingPools,
      lenderDeposits,
      lending,
      iouSetup,
      walletSeedCrypto,
      txEvidence,
      clock,
      ids,
    ),
    borrowerLoanRequest: new BorrowerLoanRequestUseCase(
      kycStatuses,
      creditAssessments,
      wallets,
      lendingPools,
      loanPositions,
      lending,
      iouSetup,
      walletSeedCrypto,
      txEvidence,
      clock,
      ids,
    ),
    repayLoan: new RepayLoanUseCase(kycStatuses, wallets, loanPositions, lending, loanQuery, walletSeedCrypto, txEvidence, clock),
    getLoanOutstanding: new GetLoanOutstandingUseCase(loanPositions, loanQuery),
    withdrawFromVault: new WithdrawFromVaultUseCase(
      kycStatuses,
      wallets,
      lendingPools,
      lenderDeposits,
      withdrawalRequests,
      bufferLedger,
      lending,
      bufferDisbursement,
      iouSetup,
      walletSeedCrypto,
      txEvidence,
      bufferWalletSeed,
      bufferInitialBalanceDrops,
      clock,
      ids,
    ),
    bootstrapLendingPool: new BootstrapLendingPoolUseCase(lendingPools, lending, walletSeedCrypto, clock, ids),
    mail,
    lending,
  };
}
