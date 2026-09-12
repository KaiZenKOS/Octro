#!/usr/bin/env node
// Applique les migrations SQL brutes de infra/db/migrations/ dans l'ordre du
// nom de fichier. Idempotent : une migration deja appliquee (par nom, table
// schema_migrations) n'est jamais rejouee. Pas d'ORM (coherent avec le reste
// du depot). Usage : node --env-file=.env infra/db/migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_MIGRATIONS_DIR = join(REPO_ROOT, "infra", "migrations");

// PGSSLROOTCERT epingle un certificat auto-signe precis (voir .env) : verifie
// ce certificat exact, jamais "n'importe quel certificat" (rejectUnauthorized
// reste true) — plus sur que de desactiver la verification TLS.
function buildSslConfig() {
  if (process.env["PGSSLMODE"] !== "verify-full") {
    throw new Error("PGSSLMODE must be verify-full before applying migrations");
  }
  const rootCertPath = process.env["PGSSLROOTCERT"];
  if (rootCertPath) {
    const resolved = join(REPO_ROOT, rootCertPath);
    if (existsSync(resolved)) {
      // Voir packages/application/src/adapters/pg/create-pg-pool.ts : le
      // certificat epingle est verifie mot pour mot (ca), son CN/SAN est le
      // nom d'hote du fournisseur cloud, pas PGHOST — checkServerIdentity
      // desactive uniquement la verification du nom d'hote.
      return { rejectUnauthorized: true, ca: readFileSync(resolved, "utf-8"), checkServerIdentity: () => undefined };
    }
  }
  return { rejectUnauthorized: true };
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`missing required environment variable: ${key}`);
  }
  return value;
}

function requiredPort() {
  const raw = process.env["PGPORT"] ?? "5432";
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) {
    throw new Error("PGPORT must be an integer between 1 and 65535");
  }
  return Number(raw);
}

async function listMigrationFiles(directory, prefix) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((filename) => ({
      filename,
      path: join(directory, filename),
      key: `${prefix}${filename}`,
    }));
}

async function main() {
  const client = new Client({
    host: requiredEnv("PGHOST"),
    port: requiredPort(),
    database: requiredEnv("PGDATABASE"),
    user: requiredEnv("PGADMINUSER"),
    password: requiredEnv("PGADMINPASSWORD"),
    ssl: buildSslConfig(),
  });
  if (process.env["PGADMINUSER"] === process.env["PGAPPUSER"]) {
    throw new Error("PGADMINUSER must be distinct from PGAPPUSER");
  }
  await client.connect();

  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const { rows: applied } = await client.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set(applied.map((row) => row.filename));

    // The legacy account/lending schema keeps its historical migration keys.
    // The v2.2 Workspace/forecast/outbox baseline is tracked under a namespace
    // so its 0001 file does not collide with the older 0001_init.sql.
    const migrations = [
      ...(await listMigrationFiles(MIGRATIONS_DIR, "")),
      ...(await listMigrationFiles(CORE_MIGRATIONS_DIR, "core/")),
    ];

    for (const migration of migrations) {
      if (appliedSet.has(migration.key)) {
        console.log(`skip (already applied): ${migration.key}`);
        continue;
      }
      const sql = await readFile(migration.path, "utf-8");
      console.log(`applying: ${migration.key}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [migration.key]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("migrations up to date");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
