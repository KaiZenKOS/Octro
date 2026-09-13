#!/usr/bin/env node
// Amorce UNE FOIS le vault + loan broker partages pour l'IOU RLUSD simule
// (integration xrpl-lending-sim), en plus de celui deja amorce pour XRP
// (infra/scripts/bootstrap-lending-pool.mjs, inchange). Meme principe,
// avec les etapes IOU supplementaires verifiees en reel dans
// xrpl-lending-sim/simulate.js (setupIssuer/ensureTrustline/fundWithIou) :
//   1. AccountSet asfDefaultRipple sur l'issuer (idempotent — deja active
//      pour l'issuer fourni par l'equipe, mais sans effet si rappele).
//   2. Trustline du proprietaire du pool vers l'issuer (necessaire pour
//      pouvoir deposer le Cover en RLUSD).
//   3. Paiement initial de l'issuer vers le proprietaire du pool (pour
//      qu'il ait de quoi deposer ce Cover).
//   4. VaultCreate + LoanBrokerSet + LoanBrokerCoverDeposit (meme
//      BootstrapLendingPoolUseCase que pour XRP).
//
// Usage : node --env-file=.env infra/scripts/bootstrap-rlusd-pool.mjs
// Requiert RLUSD_ISSUER_ADDRESS/RLUSD_ISSUER_SEED (.env, fournis par
// l'equipe). Variables optionnelles : RLUSD_BOOTSTRAP_DEBT_MAXIMUM (defaut
// "100000" RLUSD), RLUSD_BOOTSTRAP_MANAGEMENT_FEE_RATE (defaut 0.01),
// RLUSD_BOOTSTRAP_COVER_AMOUNT (defaut "1000" RLUSD).
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BootstrapLendingPoolUseCase,
  InMemoryLendingPoolRepository,
  NodeAesGcmAdapter,
  parseLendingAssetId,
  PgLendingPoolRepository,
  SystemClock,
  UuidIdGenerator,
  createPgPool,
} from "../../packages/application/dist/index.js";
import { HACKATHON_DEVNET, XrplIouSetupAdapter, XrplLendingV1Adapter } from "../../packages/xrpl/dist/index.js";

const FAUCET_ENDPOINT = "https://lending-hackathon-faucet.dev.ripplex.io/accounts";
const RLUSD_CURRENCY_LABEL = "RLUSD";
const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_FILE = join(HERE, "bootstrap-rlusd-pool.evidence.json");

function assertReady(result, label) {
  if (result.outcome !== "ready") {
    throw new Error(`${label} did not succeed: ${JSON.stringify(result)}`);
  }
  return result;
}

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
  const issuerAddress = process.env["RLUSD_ISSUER_ADDRESS"];
  const issuerSeed = process.env["RLUSD_ISSUER_SEED"];
  if (!issuerAddress || !issuerSeed) {
    throw new Error("RLUSD_ISSUER_ADDRESS and RLUSD_ISSUER_SEED must be set (see .env.example)");
  }

  const debtMaximum = process.env["RLUSD_BOOTSTRAP_DEBT_MAXIMUM"] ?? "100000"; // 100 000 RLUSD
  // Echelle centieme de milli-pourcent (/100000, comme InterestRate et
  // CoverRateMinimum/CoverRateLiquidation) : 1000 = 1%, meme valeur que
  // xrpl-lending-sim/simulate.js#MANAGEMENT_FEE_RATE. Un flottant brut
  // (ex. 0.01) casse l'encodage UInt16 du champ ledger.
  const managementFeeRate = Number(process.env["RLUSD_BOOTSTRAP_MANAGEMENT_FEE_RATE"] ?? "1000");
  const coverAmount = process.env["RLUSD_BOOTSTRAP_COVER_AMOUNT"] ?? "1000"; // 1 000 RLUSD

  console.log("Funding a new platform vault-owner wallet via the Hackathon Devnet faucet...");
  const owner = await fundOwnerWallet();
  console.log(`owner address: ${owner.address}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // "RLUSD" (5 caracteres) n'est pas un code devise standard (3
  // caracteres) : encode au format ledger (40 hex) via le meme helper que
  // le reste de l'app (packages/application/src/lending-asset.ts), jamais
  // duplique ici.
  const assetId = `xrpl:${RLUSD_CURRENCY_LABEL}:${issuerAddress}`;
  const { ledgerAsset } = parseLendingAssetId(assetId);
  const ledgerCurrency = ledgerAsset.currency;

  const iouSetup = new XrplIouSetupAdapter(HACKATHON_DEVNET.wss);

  console.log("Activating DefaultRipple on the RLUSD issuer (idempotent)...");
  assertReady(await iouSetup.activateDefaultRipple({ issuerSeed }), "AccountSet asfDefaultRipple");

  console.log("Establishing the pool owner's trustline to the RLUSD issuer...");
  assertReady(
    await iouSetup.createTrustline({
      holderSeed: owner.seed,
      currency: ledgerCurrency,
      issuerAddress,
      limit: "1000000000",
    }),
    "TrustSet (pool owner)",
  );

  console.log(`Funding the pool owner with ${coverAmount} RLUSD (for the Cover deposit)...`);
  assertReady(
    await iouSetup.sendIouPayment({
      issuerSeed,
      destinationAddress: owner.address,
      currency: ledgerCurrency,
      value: coverAmount,
    }),
    "Payment (fund pool owner)",
  );

  const lending = new XrplLendingV1Adapter(HACKATHON_DEVNET.wss);
  const cryptoKey = process.env["WALLET_SEED_ENCRYPTION_KEY"] ?? Buffer.alloc(32, 1).toString("base64");
  const crypto = new NodeAesGcmAdapter(cryptoKey);
  const { repository, persistedToPostgres } = await buildRepository();

  const bootstrap = new BootstrapLendingPoolUseCase(repository, lending, crypto, new SystemClock(), new UuidIdGenerator());
  console.log(`Creating the RLUSD vault (${assetId}), loan broker, and Cover deposit...`);
  const result = await bootstrap.execute({
    assetId,
    ownerAddress: owner.address,
    ownerSeed: owner.seed,
    debtMaximumDrops: debtMaximum,
    managementFeeRate,
    coverRateMinimum: 10000, // 10%, meme valeur que xrpl-lending-sim/simulate.js
    coverRateLiquidation: 5000, // 5%
    coverAmount,
  });

  const evidence = {
    generated_at: new Date().toISOString(),
    network: HACKATHON_DEVNET.wss,
    asset_id: assetId,
    issuer_address: issuerAddress,
    owner_address: owner.address,
    vault_id: result.vaultId,
    loan_broker_id: result.loanBrokerId,
    already_bootstrapped: result.alreadyBootstrapped,
    persisted_to_postgres: persistedToPostgres,
    note: persistedToPostgres
      ? "Pool persisted in the lending_pool table (Postgres was reachable from this run)."
      : "Postgres was NOT reachable from this run: insert this row into lending_pool manually, or rerun this script once Postgres is reachable. owner_seed below is REAL and controls real (faucet) funds plus RLUSD on the Hackathon Devnet — handle this file like any other secret (never commit it).",
  };
  if (!persistedToPostgres) {
    evidence.owner_seed = owner.seed;
  }
  await writeFile(EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
  console.log(`Evidence written to ${EVIDENCE_FILE}`);
  console.log(JSON.stringify({ assetId, vaultId: result.vaultId, loanBrokerId: result.loanBrokerId, ownerAddress: owner.address }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
