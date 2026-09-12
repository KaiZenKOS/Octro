import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { SqlClient, SqlPool } from "../src/sql.js";
import { PostgresIdempotencyExecutor } from "../src/idempotency.js";
import { PostgresWorkspaceRepository } from "../src/repositories.js";
import { enqueueOutboxInTransaction, PostgresOutboxRepository } from "../src/outbox.js";

const databaseUrl = process.env.OCTRO_TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("PostgreSQL v2.2 integration (SEC-01/02, CDC ch.22)", () => {
  let pool: { connect(): Promise<any>; query(text: string): Promise<any>; end(): Promise<void> } | undefined;
  let schema = "";

  afterAll(async () => {
    if (!pool) return;
    if (schema) await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  });

  it("applies the migration, scopes reads, and persists one idempotent outbox command", async () => {
    const driverName = process.env.OCTRO_TEST_PG_DRIVER_MODULE ?? "pg";
    const driver = await import(driverName) as { Pool: new (options: { connectionString: string }) => typeof pool };
    pool = new driver.Pool({ connectionString: databaseUrl! });
    schema = `octro_it_${randomUUID().replaceAll("-", "")}`;
    await pool.query(`CREATE SCHEMA "${schema}"`);

    const dbPool = pool;
    const scopedPool: SqlPool = {
      connect: async (): Promise<SqlClient> => {
        const client = await dbPool.connect();
        await client.query(`SET search_path TO "${schema}"`);
        return client as SqlClient;
      },
    };
    const migrationPath = fileURLToPath(new URL("../../../infra/migrations/0001_core_persistence.sql", import.meta.url));
    const migrationSql = await readFile(migrationPath, "utf8");
    const migrationClient = await scopedPool.connect();
    try {
      await migrationClient.query(migrationSql);
    } finally {
      migrationClient.release?.();
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
