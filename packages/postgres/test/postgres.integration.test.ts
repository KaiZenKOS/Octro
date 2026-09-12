import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { EconomicEvent } from "@octro/contracts";
import type { SqlClient, SqlPool } from "../src/sql.js";
import { PostgresIdempotencyExecutor } from "../src/idempotency.js";
import { PostgresEconomicEventRepository, PostgresWorkspaceRepository } from "../src/repositories.js";
import { enqueueOutboxInTransaction, PostgresOutboxRepository } from "../src/outbox.js";

const databaseUrl = process.env.OCTRO_TEST_DATABASE_URL;
const useConfiguredDatabase = process.env.OCTRO_TEST_USE_CONFIGURED_DATABASE === "true";
const integration = describe.skipIf(!databaseUrl && !useConfiguredDatabase);

integration("PostgreSQL v2.2 integration (SEC-01/02, CDC ch.22)", () => {
  let pool: { connect(): Promise<any>; query(text: string): Promise<any>; end(): Promise<void> } | undefined;
  let adminPool: { connect(): Promise<any>; query(text: string): Promise<any>; end(): Promise<void> } | undefined;
  let schema = "";

  afterAll(async () => {
    if (!adminPool && !pool) return;
    const cleanupPool = adminPool ?? pool;
    if (schema) await cleanupPool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool?.end();
    if (adminPool !== pool) await adminPool?.end();
  });

  it("applies the migration, scopes reads, and persists one idempotent outbox command", async () => {
    const driverName = process.env.OCTRO_TEST_PG_DRIVER_MODULE ?? "pg";
    const driver = await import(driverName) as { Pool: new (options: Record<string, unknown>) => typeof pool };
    let adminOptions: Record<string, unknown>;
    let runtimeOptions: Record<string, unknown>;
    if (databaseUrl) {
      adminOptions = { connectionString: databaseUrl };
      runtimeOptions = adminOptions;
    } else {
      if (process.env.PGSSLMODE !== "verify-full") {
        throw new Error("OCTRO_TEST_USE_CONFIGURED_DATABASE requires PGSSLMODE=verify-full");
      }
      const caPath = process.env.PGSSLROOTCERT ? resolve(process.env.PGSSLROOTCERT) : "";
      const ssl = caPath && existsSync(caPath)
        ? { rejectUnauthorized: true, ca: readFileSync(caPath, "utf8"), checkServerIdentity: () => undefined }
        : { rejectUnauthorized: true };
      adminOptions = {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGADMINUSER,
        password: process.env.PGADMINPASSWORD,
        ssl,
      };
      runtimeOptions = {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGAPPUSER,
        password: process.env.PGAPPPASSWORD,
        ssl,
      };
    }
    adminPool = new driver.Pool(adminOptions);
    pool = databaseUrl ? adminPool : new driver.Pool(runtimeOptions);
    schema = `octro_it_${randomUUID().replaceAll("-", "")}`;
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    if (!databaseUrl) {
      const appRole = process.env.PGAPPUSER ?? "";
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(appRole)) throw new Error("configured test runtime role name is invalid");
      await adminPool.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${appRole}"`);
    }

    const dbPool = pool;
    const scopedPool: SqlPool = {
      connect: async (): Promise<SqlClient> => {
        const client = await dbPool.connect();
        await client.query(`SET search_path TO "${schema}"`);
        return client as SqlClient;
      },
    };
    const legacySchemaSql = `
      CREATE TABLE workspaces (
        id uuid PRIMARY KEY, tenant_id uuid NOT NULL,
        kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
        owner_user_id uuid NOT NULL, organization_id uuid, display_name text NOT NULL,
        created_at timestamptz NOT NULL,
        CONSTRAINT personal_no_org CHECK (
          (kind = 'personal' AND organization_id IS NULL) OR
          (kind = 'organization' AND organization_id IS NOT NULL)
        ),
        CONSTRAINT tenant_id_equals_id CHECK (tenant_id = id)
      );
      CREATE TABLE economic_events (
        id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES workspaces(id),
        source_event_id text NOT NULL, connection_ref text,
        direction text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
        amount_decimal text NOT NULL, asset_id text NOT NULL,
        status text NOT NULL CHECK (status IN ('expected', 'settled', 'cancelled')),
        verification text NOT NULL CHECK (verification IN ('declared', 'imported', 'provider_verified', 'ledger_verified')),
        label text NOT NULL, occurred_at timestamptz, observed_at timestamptz NOT NULL,
        expected_settlement_at timestamptz, raw_object_ref text,
        CONSTRAINT unique_tenant_source UNIQUE (tenant_id, source_event_id)
      );
    `;
    const hardeningSql = await readFile(fileURLToPath(new URL("../../../infra/db/migrations/0004_workspace_event_hardening.sql", import.meta.url)), "utf8");
    const coreSql = await readFile(fileURLToPath(new URL("../../../infra/migrations/0001_core_persistence.sql", import.meta.url)), "utf8");
    const migrationClient = await adminPool.connect();
    try {
      await migrationClient.query(`SET search_path TO "${schema}"`);
      await migrationClient.query("BEGIN");
      await migrationClient.query(legacySchemaSql);
      await migrationClient.query(hardeningSql);
      await migrationClient.query(coreSql);
      await migrationClient.query("COMMIT");
    } catch (error) {
      await migrationClient.query("ROLLBACK");
      throw error;
    } finally {
      migrationClient.release?.();
    }
    if (!databaseUrl) {
      const appRole = process.env.PGAPPUSER ?? "";
      await adminPool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO "${appRole}"`);
    }

    const workspaceA = "11111111-1111-4111-8111-111111111111";
    const workspaceB = "22222222-2222-4222-8222-222222222222";
    const owner = "33333333-3333-4333-8333-333333333333";
    await new PostgresWorkspaceRepository(scopedPool, workspaceA).save({
      id: workspaceA, tenant_id: workspaceA, kind: "personal", owner_user_id: owner,
      display_name: "Workspace A", created_at: "2026-09-12T10:00:00.000Z",
    });
    await new PostgresWorkspaceRepository(scopedPool, workspaceB).save({
      id: workspaceB, tenant_id: workspaceB, kind: "personal", owner_user_id: owner,
      display_name: "Workspace B", created_at: "2026-09-12T10:00:00.000Z",
    });

    // The B-scoped adapter cannot observe A, even when given A's identifier (SEC-01).
    expect(await new PostgresWorkspaceRepository(scopedPool, workspaceB).findById(workspaceA)).toBeNull();

    const events = new PostgresEconomicEventRepository(scopedPool, workspaceA);
    const makeEvent = (id: string, connectionRef?: string): EconomicEvent => ({
      id,
      tenant_id: workspaceA,
      source_event_id: "source-shared-between-connections",
      ...(connectionRef === undefined ? {} : { connection_ref: connectionRef }),
      direction: "inflow",
      amount: { amount_decimal: "230", asset_id: "fiat:EUR" },
      status: "expected",
      verification: "imported",
      label: "Expected payment",
      observed_at: "2026-09-12T10:00:00.000Z",
    });
    const first = makeEvent("66666666-6666-4666-8666-666666666666", "connector-a");
    await events.save(first);
    await events.save(makeEvent("77777777-7777-4777-8777-777777777777", "connector-b"));
    await events.save(makeEvent("88888888-8888-4888-8888-888888888888"));
    const replay = await events.save({ ...first, id: "99999999-9999-4999-8999-999999999999" });
    expect(replay.id).toBe(first.id);
    await expect(events.save({ ...first, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", amount: { amount_decimal: "231", asset_id: "fiat:EUR" } }))
      .rejects.toThrow(/different body/);
    expect(await events.listByTenant(workspaceA)).toHaveLength(3);

    const inspectClient = await scopedPool.connect();
    try {
      const roleState = await inspectClient.query(
        `SELECT r.rolsuper, r.rolbypassrls, r.rolcreaterole, r.rolcreatedb,
                has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create_schema
         FROM pg_roles r WHERE r.rolname = current_user`,
      );
      expect(roleState.rows[0]).toMatchObject({ rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false, can_create_schema: false });
      const amountType = await inspectClient.query(
        `SELECT data_type, numeric_precision, numeric_scale
         FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'economic_events' AND column_name = 'amount_decimal'`,
      );
      expect(amountType.rows[0]).toMatchObject({ data_type: "numeric", numeric_precision: 38, numeric_scale: 18 });
      const rls = await inspectClient.query(
        `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
         WHERE relnamespace = current_schema()::regnamespace AND relname IN ('workspaces', 'economic_events')`,
      );
      expect(rls.rows).toHaveLength(2);
      expect(rls.rows.every((row: Record<string, unknown>) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
      const sourceIndexes = await inspectClient.query(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = current_schema() AND tablename = 'economic_events'
           AND indexname IN ('economic_events_source_without_connection', 'economic_events_source_with_connection')`,
      );
      expect(sourceIndexes.rows).toHaveLength(2);
    } finally {
      inspectClient.release?.();
    }

    let writes = 0;
    const executor = new PostgresIdempotencyExecutor(scopedPool, workspaceA);
    const command = async () => executor.execute("POST:/v1/action-plans", "integration-key", { amount_decimal: "230", asset_id: "fiat:EUR" }, async (client) => {
      writes += 1;
      await enqueueOutboxInTransaction(client, {
        id: randomUUID(), tenant_id: workspaceA, event_type: "forecast.completed", payload: { amount_decimal: "230" },
      });
      return { statusCode: 202, body: { accepted: true, amount_decimal: "230" } };
    });
    expect((await command()).replayed).toBe(false);
    expect((await command()).replayed).toBe(true);
    expect(writes).toBe(1);
    await expect(executor.execute("POST:/v1/action-plans", "integration-key", { amount_decimal: "231", asset_id: "fiat:EUR" }, async () => ({ statusCode: 202, body: {} })))
      .rejects.toMatchObject({ statusCode: 409 });

    const claimed = await new PostgresOutboxRepository(scopedPool, workspaceA)
      .claimBatch(5, 30, "44444444-4444-4444-8444-444444444444");
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.payload).toEqual({ amount_decimal: "230" });
    expect(await new PostgresOutboxRepository(scopedPool, workspaceB).claimBatch(5, 30, "55555555-5555-4555-8555-555555555555"))
      .toHaveLength(0);
  }, 30_000);
});
