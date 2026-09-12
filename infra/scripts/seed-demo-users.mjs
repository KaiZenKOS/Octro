#!/usr/bin/env node
// Amorce deux comptes de demo pour le MVP (lender/borrower) : inscription
// reelle, verification email auto-confirmee (code capture via
// RecordingMailAdapter plutot qu'un envoi reel a une adresse fictive),
// KYC simule "valide" par defaut, une evaluation de credit "approve"
// inseree directement (contourne Odoo, purement pour la demo — decrit dans
// la sortie), et fonde le wallet XRPL reel du lender via le faucet du
// Hackathon Devnet (Payment relais, le faucet ne finance jamais une adresse
// existante). Operation d'administration, hors trafic public.
//
// Usage : node --env-file=.env infra/scripts/seed-demo-users.mjs
import {
  ConfirmEmailUseCase,
  createPgPool,
  NodeAesGcmAdapter,
  PgCreditAssessmentRepository,
  PgEmailVerificationRepository,
  PgKycStatusRepository,
  PgOdooConnectionRepository,
  PgUserRepository,
  PgWalletRepository,
  ProvisionWalletUseCase,
  RecordingMailAdapter,
  SignUpUseCase,
  SimulateKycUseCase,
  SystemClock,
  UuidIdGenerator,
} from "../../packages/application/dist/index.js";
import { HACKATHON_DEVNET, XrplPaymentAdapter, XrplWalletProvisioningAdapter } from "../../packages/xrpl/dist/index.js";

const PASSWORD = "Test123*";
const FUND_AMOUNT_DROPS = "500000000"; // 500 XRP, largement suffisant pour la demo (depot + frais)
const FAUCET_ENDPOINT = "https://lending-hackathon-faucet.dev.ripplex.io/accounts";

const DEMO_USERS = [
  { email: "borrow@octro.co", role: "borrower" },
  { email: "lend@octro.co", role: "lender" },
];

async function fundNewFaucetAccount() {
  const response = await fetch(FAUCET_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`faucet HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  return { address: payload.account.address, seed: payload.account.secret };
}

async function main() {
  const pool = createPgPool({
    host: process.env["PGHOST"] ?? "",
    port: Number(process.env["PGPORT"] ?? 5432),
    database: process.env["PGDATABASE"] ?? "",
    user: process.env["PGUSER"] ?? "",
    password: process.env["PGPASSWORD"] ?? "",
    sslMode: process.env["PGSSLMODE"] ?? "",
    ...(process.env["PGSSLROOTCERT"] ? { sslRootCertPath: process.env["PGSSLROOTCERT"] } : {}),
  });

  const users = new PgUserRepository(pool);
  const emailVerifications = new PgEmailVerificationRepository(pool);
  const kycStatuses = new PgKycStatusRepository(pool);
  const wallets = new PgWalletRepository(pool);
  const odooConnections = new PgOdooConnectionRepository(pool);
  const creditAssessments = new PgCreditAssessmentRepository(pool);

  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const walletSeedCrypto = new NodeAesGcmAdapter(
    process.env["WALLET_SEED_ENCRYPTION_KEY"] ?? Buffer.alloc(32, 1).toString("base64"),
  );
  const odooApiKeyCrypto = new NodeAesGcmAdapter(
    process.env["ODOO_API_KEY_ENCRYPTION_KEY"] ?? Buffer.alloc(32, 2).toString("base64"),
  );
  const walletProvisioning = new XrplWalletProvisioningAdapter();
  const payment = new XrplPaymentAdapter(HACKATHON_DEVNET.wss);
  // Capture le code de verification au lieu d'un envoi reel : borrow@octro.co
  // / lend@octro.co ne sont pas des boites reelles pour ce hackathon.
  const mail = new RecordingMailAdapter();

  const provisionWallet = new ProvisionWalletUseCase(wallets, walletProvisioning, walletSeedCrypto, clock, ids);
  const signUp = new SignUpUseCase(users, emailVerifications, mail, provisionWallet, clock, ids);
  const confirmEmail = new ConfirmEmailUseCase(users, emailVerifications, clock);
  const simulateKyc = new SimulateKycUseCase(kycStatuses, clock, ids);

  const results = [];

  for (const { email, role } of DEMO_USERS) {
    console.log(`\n=== ${email} (${role}) ===`);
    const created = await signUp.execute({ email, password: PASSWORD });
    console.log(`user created: ${created.id}`);

    const sentText = mail.last?.text ?? "";
    const code = sentText.match(/(\d{6})/)?.[1];
    if (!code) throw new Error(`could not extract verification code for ${email} from captured email: ${sentText}`);
    const verified = await confirmEmail.execute({ userId: created.id, code });
    console.log(`email verified: ${verified.email_verified_at}`);

    await simulateKyc.execute({ userId: created.id, result: "valid" });
    console.log("KYC simulated: valid");

    // Evaluation de credit "approve" inseree directement (contourne Odoo) :
    // purement une donnee de demo MVP, jamais un vrai calcul du pipeline
    // packages/credit. Necessite une ligne odoo_connections (contrainte FK)
    // — une connexion factice, jamais utilisee pour un vrai appel Odoo.
    const odooConnectionId = ids.newId();
    await odooConnections.save({
      id: odooConnectionId,
      userId: created.id,
      provider: "odoo",
      odooUrl: "https://demo.invalid/odoo",
      odooDb: null,
      apiKeyCiphertext: await odooApiKeyCrypto.encrypt("demo-fixture-not-a-real-key"),
      createdAt: clock.now(),
      lastUsedAt: null,
    });
    await creditAssessments.save({
      id: ids.newId(),
      user_id: created.id,
      odoo_connection_id: odooConnectionId,
      generated_at: clock.now().toISOString(),
      composite_score: 82,
      grade: "B",
      decision: "approve",
      max_recommended_credit_line: { amount_decimal: "5000", asset_id: "fiat:EUR" },
      term_months: 12,
      indicative_annual_rate_pct: 6.5,
      risk_notes: ["Évaluation de démonstration MVP — insérée directement, ne provient pas d'un calcul Odoo réel."],
      details: { demo_fixture: true },
    });
    console.log("credit assessment inserted: approve (grade B)");

    const wallet = await wallets.findByUserId(created.id);
    console.log(`wallet address: ${wallet.address}`);

    let fundedTxHash = null;
    if (role === "lender") {
      console.log("funding lender wallet via Hackathon Devnet faucet (relay payment)...");
      const faucetAccount = await fundNewFaucetAccount();
      // Laisse le temps au faucet de crediter son propre compte relais
      // avant de rebondir un paiement depuis celui-ci.
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const sent = await payment.sendTestPayment({
        sourceSeed: faucetAccount.seed,
        destinationAddress: wallet.address,
        amountDrops: FUND_AMOUNT_DROPS,
      });
      if (sent.outcome !== "ready") {
        throw new Error(`funding payment to ${wallet.address} did not succeed: ${JSON.stringify(sent)}`);
      }
      fundedTxHash = sent.data.txHash;
      console.log(`lender wallet funded: ${FUND_AMOUNT_DROPS} drops (tx ${fundedTxHash})`);
    }

    results.push({ email, role, user_id: created.id, wallet_address: wallet.address, funded_tx_hash: fundedTxHash });
  }

  console.log("\n=== Résumé (identifiants de démo) ===");
  for (const r of results) {
    console.log(`${r.role.padEnd(8)} ${r.email}  password=${PASSWORD}  wallet=${r.wallet_address}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
