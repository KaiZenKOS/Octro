import { describe, expect, it } from "vitest";
import type { EconomicEvent } from "@octro/contracts";
import {
  assertNumeric38Scale18,
  IdempotencyBodyConflictError,
  PostgresEconomicEventRepository,
  PostgresIdempotencyExecutor,
  PostgresOutboxRepository,
  type SqlClient,
  type SqlPool,
  type SqlResult,
} from "../src/index.js";

type KeyRow = {
  body_sha256: string;
  status: "processing" | "completed";
  response_status: number | null;
  response_json: unknown;
};

class IdempotencyPool implements SqlPool {
  keys = new Map<string, KeyRow>();
  scopes: string[] = [];
  statements: Array<{ text: string; values: unknown[] }> = [];

  async connect(): Promise<SqlClient> {
    const pool = this;
    let local = new Map(pool.keys);
    let backup = new Map(pool.keys);
    const client: SqlClient = {
      query: async <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
        pool.statements.push({ text, values });
        const sql = text.trim().toLowerCase();
        if (sql === "begin") { backup = new Map(local); return { rows: [], rowCount: null } as SqlResult<Row>; }
        if (sql === "commit") { pool.keys = new Map(local); return { rows: [], rowCount: null } as SqlResult<Row>; }
        if (sql === "rollback") { local = new Map(backup); pool.keys = new Map(local); return { rows: [], rowCount: null } as SqlResult<Row>; }
        if (sql.startsWith("select set_config")) { pool.scopes.push(String(values[0])); return { rows: [], rowCount: 1 } as SqlResult<Row>; }
        if (sql.startsWith("insert into idempotency_keys")) {
          const [tenant, route, key, bodyHash] = values as string[];
          const composite = `${tenant}:${route}:${key}`;
          if (local.has(composite)) return { rows: [], rowCount: 0 } as SqlResult<Row>;
          local.set(composite, { body_sha256: bodyHash!, status: "processing", response_status: null, response_json: null });
          return { rows: [{ route_key: route }], rowCount: 1 } as unknown as SqlResult<Row>;
        }
        if (sql.startsWith("select body_sha256")) {
          const [tenant, route, key] = values as string[];
          const row = local.get(`${tenant}:${route}:${key}`);
          return { rows: row ? [row] : [], rowCount: row ? 1 : 0 } as unknown as SqlResult<Row>;
        }
        if (sql.startsWith("update idempotency_keys")) {
          const [tenant, route, key, status, responseJson] = values as [string, string, string, number, string];
          const composite = `${tenant}:${route}:${key}`;
          const row = local.get(composite);
          if (row) local.set(composite, { ...row, status: "completed", response_status: status, response_json: JSON.parse(responseJson) });
          return { rows: [], rowCount: row ? 1 : 0 } as SqlResult<Row>;
        }
        throw new Error(`Unexpected SQL in idempotency fake: ${text}`);
      },
    };
    return client;
  }
}

class RecordingPool implements SqlPool {
  statements: Array<{ text: string; values: unknown[] }> = [];
  response: unknown[] = [];
  eventConflict = false;
  priorEvent: Record<string, unknown> | undefined;
  async connect(): Promise<SqlClient> {
    const pool = this;
    return {
      query: async <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
        pool.statements.push({ text, values });
        if (text.includes("INSERT INTO economic_events")) {
          if (pool.eventConflict) return { rows: [], rowCount: 0 } as SqlResult<Row>;
          const [id, tenant_id, connection_ref, source_event_id, direction, amount_decimal, asset_id, status, verification, label, occurred_at, observed_at, expected_settlement_at, raw_object_ref] = values;
          const row = {
            id, tenant_id, connection_ref, source_event_id, direction, amount_decimal, asset_id, status, verification,
            label, occurred_at, observed_at, expected_settlement_at, raw_object_ref,
          };
          pool.priorEvent = row as Record<string, unknown>;
          return { rows: [row], rowCount: 1 } as unknown as SqlResult<Row>;
        }
        if (text.includes("FROM economic_events WHERE tenant_id")) {
          return { rows: pool.priorEvent ? [pool.priorEvent] : [], rowCount: pool.priorEvent ? 1 : 0 } as unknown as SqlResult<Row>;
        }
        if (text.includes("WITH ready AS")) {
          return { rows: pool.response, rowCount: pool.response.length } as unknown as SqlResult<Row>;
        }
        if (text.includes("set_config")) return { rows: [], rowCount: 1 } as SqlResult<Row>;
        return { rows: [], rowCount: 1 } as SqlResult<Row>;
      },
    };
  }
}

const tenant = "11111111-1111-4111-8111-111111111111";

describe("PostgreSQL persistence adapter (DATA-03, SEC-01/02, OPS-01, PER-11)", () => {
  it("accepts only exact decimal strings that fit NUMERIC(38,18) (DATA-03)", () => {
    expect(() => assertNumeric38Scale18("123.000000000000000001")).not.toThrow();
    expect(() => assertNumeric38Scale18(123.45)).toThrow(/decimal strings/);
    expect(() => assertNumeric38Scale18("100000000000000000000")).toThrow(/NUMERIC\(38,18\)/);
    expect(() => assertNumeric38Scale18("1.0000000000000000001")).toThrow(/strict decimal strings/);
  });

  it("passes decimal strings as text to PostgreSQL and binds the tenant scope (DATA-03, SEC-01)", async () => {
    const pool = new RecordingPool();
    const repository = new PostgresEconomicEventRepository(pool, tenant);
    const event: EconomicEvent = {
      id: "22222222-2222-4222-8222-222222222222",
      tenant_id: tenant,
      source_event_id: "manual-1",
      direction: "outflow",
      amount: { amount_decimal: "123.000000000000000001", asset_id: "fiat:EUR" },
      status: "expected",
      verification: "declared",
      label: "Rent",
      observed_at: "2026-09-12T10:00:00.000Z",
    };
    const saved = await repository.save(event);
    expect(saved.amount.amount_decimal).toBe("123.000000000000000001");
    const insert = pool.statements.find((entry) => entry.text.includes("INSERT INTO economic_events"));
    expect(insert?.text).toContain("$6::numeric");
    expect(insert?.values[5]).toBe("123.000000000000000001");
    expect(pool.statements.some((entry) => entry.text.includes("set_config('octro.workspace_id'") && entry.values[0] === tenant)).toBe(true);
  });

  it("refuses a repository read/write scope that crosses Workspace boundaries (SEC-01)", async () => {
    const pool = new RecordingPool();
    const repository = new PostgresEconomicEventRepository(pool, tenant);
    await expect(repository.listByTenant("33333333-3333-4333-8333-333333333333")).rejects.toThrow("SEC-01");
    expect(pool.statements).toHaveLength(0);
  });

  it("treats a repeated source id and identical event body as one event (DATA-01)", async () => {
    const pool = new RecordingPool();
    const repository = new PostgresEconomicEventRepository(pool, tenant);
    const base: EconomicEvent = {
      id: "22222222-2222-4222-8222-222222222222", tenant_id: tenant, source_event_id: "bank-event-9",
      connection_ref: "bank-connection-1", direction: "inflow",
      amount: { amount_decimal: "100.25", asset_id: "fiat:EUR" }, status: "expected", verification: "imported",
      label: "Platform payment", occurred_at: "2026-09-12T09:00:00.000Z", observed_at: "2026-09-12T10:00:00.000Z",
    };
    await repository.save(base);
    pool.eventConflict = true;
    const replay = await repository.save({ ...base, id: "33333333-3333-4333-8333-333333333333", observed_at: "2026-09-12T10:05:00.000Z" });
    expect(replay.id).toBe(base.id);
    expect(pool.statements.filter((entry) => entry.text.includes("INSERT INTO economic_events"))).toHaveLength(2);
  });

  it("replays an identical key/body once, including key-order independent JSON (SEC-02)", async () => {
    const pool = new IdempotencyPool();
    const executor = new PostgresIdempotencyExecutor(pool, tenant);
    let executions = 0;
    const first = await executor.execute("POST:/v1/plans", "key-1", { z: 2, a: 1 }, async () => {
      executions += 1;
      return { statusCode: 201, body: { plan_id: "plan-1", amount_decimal: "230" } };
    });
    const replay = await executor.execute("POST:/v1/plans", "key-1", { a: 1, z: 2 }, async () => {
      executions += 1;
      return { statusCode: 201, body: { plan_id: "wrong" } };
    });
    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ statusCode: 201, body: { plan_id: "plan-1", amount_decimal: "230" }, replayed: true });
    expect(executions).toBe(1);
  });

  it("returns a 409 for the same idempotency key with a different body (SEC-02)", async () => {
    const executor = new PostgresIdempotencyExecutor(new IdempotencyPool(), tenant);
    await executor.execute("POST:/v1/plans", "key-2", { amount: "230" }, async () => ({ statusCode: 201, body: { ok: true } }));
    await expect(executor.execute("POST:/v1/plans", "key-2", { amount: "231" }, async () => ({ statusCode: 201, body: { ok: true } })))
      .rejects.toBeInstanceOf(IdempotencyBodyConflictError);
  });

  it("rolls back the key reservation when the business transaction fails (SEC-02)", async () => {
    const pool = new IdempotencyPool();
    const executor = new PostgresIdempotencyExecutor(pool, tenant);
    await expect(executor.execute("POST:/v1/plans", "retryable", {}, async () => { throw new Error("db write failed"); }))
      .rejects.toThrow("db write failed");
    expect(pool.keys.size).toBe(0);
    const succeeded = await executor.execute("POST:/v1/plans", "retryable", {}, async () => ({ statusCode: 201, body: { ok: true } }));
    expect(succeeded.replayed).toBe(false);
  });

  it("claims outbox rows through SKIP LOCKED and tenant-qualified predicates (CDC ch.22)", async () => {
    const pool = new RecordingPool();
    pool.response = [{
      id: "44444444-4444-4444-8444-444444444444", tenant_id: tenant, event_type: "forecast.completed",
      payload_json: { forecast_id: "f-1" }, attempts: 1, created_at: "2026-09-12T10:00:00.000Z", lock_token: "55555555-5555-4555-8555-555555555555",
    }];
    const repository = new PostgresOutboxRepository(pool, tenant);
    const messages = await repository.claimBatch(5, 30, "55555555-5555-4555-8555-555555555555");
    expect(messages[0]?.payload).toEqual({ forecast_id: "f-1" });
    const claim = pool.statements.find((entry) => entry.text.includes("WITH ready AS"));
    expect(claim?.text).toContain("FOR UPDATE SKIP LOCKED");
    expect(claim?.text).toContain("outbox.tenant_id = $1");
  });
});
