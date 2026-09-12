#!/usr/bin/env node
// Create or reconcile the dedicated least-privilege PostgreSQL runtime role.
// The migration administrator credentials are used only by this operator task;
// the API connects with PGAPPUSER / PGAPPPASSWORD.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TABLES = [
  "users", "sessions", "email_verifications", "kyc_statuses", "odoo_connections",
  "credit_assessments", "wallets", "lending_pool", "lender_deposits", "loan_positions",
  "withdrawal_requests", "buffer_ledger", "workspaces", "economic_events",
  "forecast_runs", "forecast_points", "plans", "approvals", "executions",
  "audit_events", "outbox_events", "idempotency_keys",
];

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`missing required environment variable: ${key}`);
  return value;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sslConfig() {
  if (process.env.PGSSLMODE !== "verify-full") {
    throw new Error("PGSSLMODE must be verify-full before provisioning PostgreSQL");
  }
  const rootCert = process.env.PGSSLROOTCERT;
  if (rootCert) {
    const resolved = join(REPO_ROOT, rootCert);
    if (existsSync(resolved)) {
      return { rejectUnauthorized: true, ca: readFileSync(resolved, "utf8"), checkServerIdentity: () => undefined };
    }
  }
  return { rejectUnauthorized: true };
}

async function main() {
  const database = requiredEnv("PGDATABASE");
  const adminUser = requiredEnv("PGADMINUSER");
  const adminPassword = requiredEnv("PGADMINPASSWORD");
  const appUser = requiredEnv("PGAPPUSER");
  const appPassword = requiredEnv("PGAPPPASSWORD");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(appUser)) {
    throw new Error("PGAPPUSER must be a simple PostgreSQL role identifier (1-63 characters)");
  }
  if (adminUser === appUser || adminPassword === appPassword) {
    throw new Error("runtime and migration administrator credentials must be distinct");
  }

  const client = new Client({
    host: requiredEnv("PGHOST"),
    port: Number(process.env.PGPORT ?? 5432),
    database,
    user: adminUser,
    password: adminPassword,
    ssl: sslConfig(),
  });
  await client.connect();

  try {
    const target = await client.query("SELECT current_database() = $1 AS matches", [database]);
    if (target.rows[0]?.matches !== true) throw new Error("connected PostgreSQL database does not match PGDATABASE");

    await client.query("BEGIN");
    try {
      const existing = await client.query("SELECT oid FROM pg_roles WHERE rolname = $1", [appUser]);
      if (existing.rowCount) {
        const ownership = await client.query(
          `SELECT count(*)::int AS count FROM pg_shdepend d
           WHERE d.refobjid = $1 AND d.deptype = 'o'`,
          [existing.rows[0].oid],
        );
        if (ownership.rows[0]?.count !== 0) {
          throw new Error("runtime role owns PostgreSQL objects; refusing to alter an owner role");
        }
        const memberships = await client.query(
          `SELECT parent.rolname FROM pg_auth_members m
           JOIN pg_roles member ON member.oid = m.member
           JOIN pg_roles parent ON parent.oid = m.roleid
           WHERE member.rolname = $1`,
          [appUser],
        );
        for (const row of memberships.rows) {
          await client.query(`REVOKE ${quoteIdentifier(row.rolname)} FROM ${quoteIdentifier(appUser)}`);
        }
        await client.query(
          `ALTER ROLE ${quoteIdentifier(appUser)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 40 PASSWORD ${quoteLiteral(appPassword)}`,
        );
      } else {
        await client.query(
          `CREATE ROLE ${quoteIdentifier(appUser)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 40 PASSWORD ${quoteLiteral(appPassword)}`,
        );
      }

      await client.query(`REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdentifier(database)} FROM ${quoteIdentifier(appUser)}`);
      await client.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(database)} TO ${quoteIdentifier(appUser)}`);
      await client.query(`REVOKE ALL PRIVILEGES ON SCHEMA public FROM ${quoteIdentifier(appUser)}`);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(appUser)}`);
      await client.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${quoteIdentifier(appUser)}`);
      await client.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${quoteIdentifier(appUser)}`);

      const present = await client.query(
        `SELECT name FROM unnest($1::text[]) AS expected(name)
         WHERE to_regclass(format('public.%I', name)) IS NULL`,
        [TABLES],
      );
      if (present.rowCount) {
        throw new Error("PostgreSQL schema is incomplete; apply migrations before provisioning the runtime role");
      }
      const writeTables = TABLES.filter((name) => name !== "audit_events");
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${writeTables.map((name) => `public.${quoteIdentifier(name)}`).join(", ")} TO ${quoteIdentifier(appUser)}`,
      );
      await client.query(
        `GRANT SELECT, INSERT ON TABLE public.${quoteIdentifier("audit_events")} TO ${quoteIdentifier(appUser)}`,
      );

      const verify = await client.query(
        `SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls,
                has_database_privilege(r.rolname, current_database(), 'CONNECT') AS can_connect,
                has_schema_privilege(r.rolname, 'public', 'USAGE') AS can_use_public,
                has_schema_privilege(r.rolname, 'public', 'CREATE') AS can_create_public,
                has_table_privilege(r.rolname, 'public.schema_migrations', 'SELECT') AS can_read_migrations
         FROM pg_roles r WHERE r.rolname = $1`,
        [appUser],
      );
      const role = verify.rows[0];
      if (!role || role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication
        || role.rolbypassrls || !role.can_connect || !role.can_use_public || role.can_create_public || role.can_read_migrations) {
        throw new Error("runtime role privilege verification failed");
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }

  console.log("PostgreSQL runtime role provisioned and verified (least-privilege, RLS-compatible).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PostgreSQL runtime role provisioning failed");
  process.exit(1);
});
