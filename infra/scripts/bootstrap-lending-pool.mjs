#!/usr/bin/env node
// Amorce UNE FOIS le vault ouvert + loan broker partages (Phase E, decision
// actee : "vault ouvert" deja verrouille par hackathon.config.json). Fonde
// un wallet proprietaire de plateforme via le faucet du Hackathon Devnet
// (meme pattern que le script JS de reference fourni par l'equipe), puis
// cree le vault + le broker via l'adaptateur XRPL deja verifie en reel
// (packages/xrpl/src/lending-v1.ts, inchange). Operation d'administration,
// hors trafic public — pas de route HTTP.
//
// Usage : node --env-file=.env infra/scripts/bootstrap-lending-pool.mjs
// Variables optionnelles : BOOTSTRAP_DEBT_MAXIMUM_DROPS (defaut 1000000000
// = 1000 XRP), BOOTSTRAP_MANAGEMENT_FEE_RATE (defaut 0).
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BootstrapLendingPoolUseCase,
  InMemoryLendingPoolRepository,
  NodeAesGcmAdapter,
  PgLendingPoolRepository,
  SystemClock,
  UuidIdGenerator,
  createPgPool,
} from "../../packages/application/dist/index.js";
import { HACKATHON_DEVNET, XrplLendingV1Adapter } from "../../packages/xrpl/dist/index.js";

const FAUCET_ENDPOINT = "https://lending-hackathon-faucet.dev.ripplex.io/accounts";
const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE = join(HERE, "bootstrap-lending-pool.evidence.json");

async function fundOwnerWallet() {
  const response = await fetch(FAUCET_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } });
  if (!response.ok) {
    throw new Error(`faucet HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return { address: payload.account.address, seed: payload.account.secret };
}

async function buildRepository() {
  if (process.env["POSTGRES_ENABLED"] === "true") {
    try {
      const pool = createPgPool({
        host: process.env["PGHOST"] ?? "",
        port: Number(process.env["PGPORT"] ?? 5432),
        database: process.env["PGDATABASE"] ?? "",
        user: process.env["PGUSER"] ?? "",
        password: process.env["PGPASSWORD"] ?? "",
        sslMode: process.env["PGSSLMODE"] ?? "",
        ...(process.env["PGSSLROOTCERT"] ? { sslRootCertPath: process.env["PGSSLROOTCERT"] } : {}),
      });
      await pool.query("SELECT 1");
      return { repository: new PgLendingPoolRepository(pool), persistedToPostgres: true };
    } catch (err) {
      console.warn(`Postgres unreachable from this environment (${err.message}); writing a local evidence file only.`);
    }
  }
  return { repository: new InMemoryLendingPoolRepository(), persistedToPostgres: false };
}

async function main() {
  const debtMaximumDrops = process.env["BOOTSTRAP_DEBT_MAXIMUM_DROPS"] ?? "1000000000"; // 1000 XRP
  const managementFeeRate = Number(process.env["BOOTSTRAP_MANAGEMENT_FEE_RATE"] ?? "0");

  console.log("Funding a new platform vault-owner wallet via the Hackathon Devnet faucet...");
  const owner = await fundOwnerWallet();
  console.log(`owner address: ${owner.address}`);
  // Laisse le temps au faucet/ledger de confirmer le compte avant usage
  // (meme delai que le script de reference fourni par l'equipe).
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const lending = new XrplLendingV1Adapter(HACKATHON_DEVNET.wss);
  const cryptoKey = process.env["WALLET_SEED_ENCRYPTION_KEY"] ?? Buffer.alloc(32, 1).toString("base64");
  const crypto = new NodeAesGcmAdapter(cryptoKey);
  const { repository, persistedToPostgres } = await buildRepository();

  const bootstrap = new BootstrapLendingPoolUseCase(repository, lending, crypto, new SystemClock(), new UuidIdGenerator());
  console.log("Creating the shared open vault (VaultCreate) then the loan broker (LoanBrokerSet)...");
  const result = await bootstrap.execute({
    assetId: process.env["BOOTSTRAP_ASSET_ID"] ?? "xrpl:XRP",
    ownerAddress: owner.address,
    ownerSeed: owner.seed,
    debtMaximumDrops,
    managementFeeRate,
  });

  const evidence = {
    generated_at: new Date().toISOString(),
    network: HACKATHON_DEVNET.wss,
    owner_address: owner.address,
    vault_id: result.vaultId,
    loan_broker_id: result.loanBrokerId,
    already_bootstrapped: result.alreadyBootstrapped,
    persisted_to_postgres: persistedToPostgres,
    note: persistedToPostgres
      ? "Pool persisted in the lending_pool table (Postgres was reachable from this run)."
      : "Postgres was NOT reachable from this run: insert this row into lending_pool manually, or rerun this script once Postgres is reachable, so the running API picks up the same shared vault/broker. owner_seed below is REAL and controls real (faucet) funds on the Hackathon Devnet — handle this file like any other secret (never commit it).",
  };
  if (!persistedToPostgres) {
    evidence.owner_seed = owner.seed;
  }
  await writeFile(EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
  console.log(`Evidence written to ${EVIDENCE_FILE}`);
  console.log(JSON.stringify({ vaultId: result.vaultId, loanBrokerId: result.loanBrokerId, ownerAddress: owner.address }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
