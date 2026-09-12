// Racine de composition v2.2 : prévision déterministe, capacités réseau
// fail-closed et extension comptes/KYC/crédit/lending partagent les mêmes cas
// d'usage. PostgreSQL et les adaptateurs réseau restent activés uniquement par
// configuration explicite ; les tests utilisent des doublures déterministes.
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
  GetLatestCreditAssessmentUseCase,
  GetPersonalProjectionUseCase,
  GetNetworkCapabilitiesUseCase,
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
  InMemoryUserRepository,
  InMemoryWalletRepository,
  InMemoryWithdrawalRequestRepository,
  InMemoryWorkspaceRepository,
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
  SaveOdooConnectionUseCase,
  type SessionRepository,
  SignUpUseCase,
  SimulateKycUseCase,
  StaticNetworkCapabilitiesAdapter,
  SystemClock,
  type Clock,
  type NetworkCapabilitiesPort,
  type OptimizerPort,
  type UserRepository,
  UuidIdGenerator,
  ValidateSessionUseCase,
  type WalletRepository,
  WithdrawFromVaultUseCase,
  type WithdrawalRequestRepository,
  type EconomicEventRepository,
  type WorkspaceRepository,
  createPgPool,
} from "@octro/application";
import {
  PostgresEconomicEventRepository,
  PostgresWorkspaceRepository,
} from "@octro/postgres";
import { loadNetworkCapabilitiesConfig } from "./adapters/network-capabilities-config.js";
import { PythonOptimizerAdapter } from "./adapters/python-optimizer-adapter.js";
import {
  type BufferDisbursementPort,
  HACKATHON_DEVNET,
  type LendingV1Port,
  type WalletProvisioningPort,
  XrplBufferDisbursementAdapter,
  XrplLendingV1Adapter,
  XrplWalletProvisioningAdapter,
} from "@octro/xrpl";

export interface DependencyOverrides {
  optimizer?: OptimizerPort;
  networkCapabilities?: NetworkCapabilitiesPort;
  hackathonConfigPath?: string;
  clock?: Clock;
}

export interface AppDependencies {
  createWorkspace: CreateWorkspaceUseCase;
  getWorkspace: GetWorkspaceUseCase;
  recordDeclaredEvent: RecordDeclaredEventUseCase;
  getPersonalProjection: GetPersonalProjectionUseCase;
  getNetworkCapabilities: GetNetworkCapabilitiesUseCase;
  approveFinancingAction: ApproveFinancingActionUseCase;
  provisionWallet: ProvisionWalletUseCase;
  signUp: SignUpUseCase;
  confirmEmail: ConfirmEmailUseCase;
  login: LoginUseCase;
  validateSession: ValidateSessionUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  simulateKyc: SimulateKycUseCase;
  getKycStatus: GetKycStatusUseCase;
  saveOdooConnection: SaveOdooConnectionUseCase;
  requestCreditAssessment: RequestCreditAssessmentUseCase;
  getLatestCreditAssessment: GetLatestCreditAssessmentUseCase;
  lenderDeposit: LenderDepositUseCase;
  borrowerLoanRequest: BorrowerLoanRequestUseCase;
  repayLoan: RepayLoanUseCase;
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
  workspaces: WorkspaceRepository;
  events: EconomicEventRepository;
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

interface PostgresConfig {
  kind: "memory" | "postgres";
  pool?: ReturnType<typeof createPgPool>;
}

function buildWorkspaceRepository(config: PostgresConfig): WorkspaceRepository {
  if (config.kind === "postgres") {
    if (config.pool === undefined) throw new Error("POSTGRES_ENABLED=true requires an active pool");
    const { pool } = config;
    return {
      async save(workspace: Parameters<WorkspaceRepository["save"]>[0]) {
        return new PostgresWorkspaceRepository(pool, workspace.tenant_id).save(workspace);
      },
      async findById(id: Parameters<WorkspaceRepository["findById"]>[0]) {
        return new PostgresWorkspaceRepository(pool, id).findById(id);
      },
    };
  }
  return new InMemoryWorkspaceRepository();
}

function buildEconomicEventRepository(config: PostgresConfig): EconomicEventRepository {
  if (config.kind === "postgres") {
    if (config.pool === undefined) throw new Error("POSTGRES_ENABLED=true requires an active pool");
    const { pool } = config;
    return {
      async save(event: Parameters<EconomicEventRepository["save"]>[0]) {
        return new PostgresEconomicEventRepository(pool, event.tenant_id).save(event);
      },
      async listByTenant(tenantId: Parameters<EconomicEventRepository["listByTenant"]>[0]) {
        return new PostgresEconomicEventRepository(pool, tenantId).listByTenant(tenantId);
      },
    };
  }
  return new InMemoryEconomicEventRepository();
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
    const postgresConfig: PostgresConfig = { kind: "postgres", pool };
    return {
      workspaces: buildWorkspaceRepository(postgresConfig),
      events: buildEconomicEventRepository(postgresConfig),
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
  const memoryConfig: PostgresConfig = { kind: "memory" };
  return {
    workspaces: buildWorkspaceRepository(memoryConfig),
    events: buildEconomicEventRepository(memoryConfig),
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

// Cle reelle (env) si presente ; sinon cle ephemere generee pour ce process
// uniquement (tests, dev sans Postgres) — jamais persistee, jamais reutilisee
// au redemarrage. infra/config/environment.mjs exige la vraie cle des que
// POSTGRES_ENABLED=true, donc ce repli ne s'applique jamais a une base reelle.
function resolveEncryptionKey(envKeyName: string): string {
  return process.env[envKeyName] ?? randomBytes(32).toString("base64");
}

export function buildDependencies(overrides: DependencyOverrides = {}): AppDependencies {
  const clock = overrides.clock ?? new SystemClock();
  const ids = new UuidIdGenerator();
  const optimizer = overrides.optimizer ?? new PythonOptimizerAdapter();
  const capabilities = overrides.networkCapabilities
    ?? new StaticNetworkCapabilitiesAdapter(loadNetworkCapabilitiesConfig({
      ...(overrides.hackathonConfigPath === undefined ? {} : { configPath: overrides.hackathonConfigPath }),
    }));

  const mail = buildMailPort();
  const {
    workspaces,
    events,
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
  // Secret plateforme unique (pas par utilisateur, jamais chiffre en base —
  // il n'existe qu'une fois, fourni via l'environnement, SEC-04).
  const bufferWalletSeed = process.env["BUFFER_WALLET_SEED"] ?? "";
  const bufferInitialBalanceDrops = process.env["BUFFER_INITIAL_BALANCE_DROPS"] ?? "1000000000";
  const provisionWallet = new ProvisionWalletUseCase(wallets, walletProvisioning, walletSeedCrypto, clock, ids);

  return {
    createWorkspace: new CreateWorkspaceUseCase(workspaces, clock, ids),
    getWorkspace: new GetWorkspaceUseCase(workspaces),
    recordDeclaredEvent: new RecordDeclaredEventUseCase(workspaces, events, clock, ids),
    getPersonalProjection: new GetPersonalProjectionUseCase(workspaces, events, optimizer, clock),
    getNetworkCapabilities: new GetNetworkCapabilitiesUseCase(capabilities),
    approveFinancingAction: new ApproveFinancingActionUseCase(workspaces, capabilities),
    provisionWallet,
    signUp: new SignUpUseCase(users, emailVerifications, mail, clock, ids),
    confirmEmail: new ConfirmEmailUseCase(users, emailVerifications, clock),
    login: new LoginUseCase(users, sessions, clock),
    validateSession: new ValidateSessionUseCase(sessions, clock),
    getCurrentUser: new GetCurrentUserUseCase(users),
    simulateKyc: new SimulateKycUseCase(kycStatuses, clock, ids),
    getKycStatus: new GetKycStatusUseCase(kycStatuses),
    saveOdooConnection: new SaveOdooConnectionUseCase(odooConnections, kycStatuses, odooApiKeyCrypto, clock, ids),
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
    lenderDeposit: new LenderDepositUseCase(kycStatuses, wallets, lendingPools, lenderDeposits, lending, walletSeedCrypto, clock, ids),
    borrowerLoanRequest: new BorrowerLoanRequestUseCase(
      kycStatuses,
      creditAssessments,
      wallets,
      lendingPools,
      loanPositions,
      lending,
      walletSeedCrypto,
      clock,
      ids,
    ),
    repayLoan: new RepayLoanUseCase(kycStatuses, wallets, loanPositions, lending, walletSeedCrypto),
    withdrawFromVault: new WithdrawFromVaultUseCase(
      kycStatuses,
      wallets,
      lendingPools,
      lenderDeposits,
      withdrawalRequests,
      bufferLedger,
      lending,
      bufferDisbursement,
      walletSeedCrypto,
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
