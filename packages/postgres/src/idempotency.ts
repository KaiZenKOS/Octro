import { createHash } from "node:crypto";
import { inWorkspaceTransaction, type SqlClient, type SqlPool } from "./sql.js";

export class IdempotencyBodyConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "IDEMPOTENCY_KEY_REUSED";
  constructor() {
    super("SEC-02: idempotency key was already used with a different request body");
    this.name = "IdempotencyBodyConflictError";
  }
}

export class IdempotencyInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyInvariantError";
  }
}

export interface IdempotentResponse<T> {
  statusCode: number;
  body: T;
}

export interface IdempotencyOutcome<T> extends IdempotentResponse<T> {
  replayed: boolean;
}

interface IdempotencyRow extends Record<string, unknown> {
  body_sha256: string;
  status: "processing" | "completed";
  response_status: number | null;
  response_json: unknown;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("idempotency bodies must contain finite JSON numbers only");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new TypeError("idempotency body must be JSON serializable");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Atomically reserves a command key and stores its exact response with business
 * writes performed by `operation` on the same SQL transaction. The unique-key
 * insert serializes concurrent requests. Uncommitted `processing` rows cannot
 * be observed; a crash rolls back both the mutation and reservation.
 */
export class PostgresIdempotencyExecutor {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async execute<T>(
    routeKey: string,
    idempotencyKey: string,
    requestBody: unknown,
    operation: (client: SqlClient) => Promise<IdempotentResponse<T>>,
  ): Promise<IdempotencyOutcome<T>> {
    if (!routeKey.trim() || routeKey.length > 200) throw new TypeError("routeKey must be 1..200 characters");
    if (!idempotencyKey.trim() || idempotencyKey.length > 200) throw new TypeError("Idempotency-Key must be 1..200 characters");
    const bodyHash = sha256Hex(canonicalJson(requestBody));

    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const reserved = await client.query<{ route_key: string }>(
        `INSERT INTO idempotency_keys (tenant_id, route_key, idempotency_key, body_sha256, status)
         VALUES ($1, $2, $3, $4, 'processing')
         ON CONFLICT (tenant_id, route_key, idempotency_key) DO NOTHING
         RETURNING route_key`,
        [this.tenantId, routeKey, idempotencyKey, bodyHash],
      );

      if (reserved.rowCount !== 1) {
        const prior = await client.query<IdempotencyRow>(
          `SELECT body_sha256, status, response_status, response_json
           FROM idempotency_keys
           WHERE tenant_id = $1 AND route_key = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [this.tenantId, routeKey, idempotencyKey],
        );
        const row = prior.rows[0];
        if (!row) throw new IdempotencyInvariantError("SEC-02: unique-key conflict was not visible in its Workspace scope");
        if (row.body_sha256 !== bodyHash) throw new IdempotencyBodyConflictError();
        if (row.status !== "completed" || row.response_status === null || row.response_json === null) {
          throw new IdempotencyInvariantError("SEC-02: a committed idempotency key must have a complete replay response");
        }
        return { statusCode: row.response_status, body: row.response_json as T, replayed: true };
      }

      const response = await operation(client);
      if (!Number.isInteger(response.statusCode) || response.statusCode < 100 || response.statusCode > 599) {
        throw new TypeError("operation response status must be an HTTP status code");
      }
      const responseJson = JSON.stringify(response.body);
      if (responseJson === undefined) throw new TypeError("operation response body must be JSON serializable");
      await client.query(
        `UPDATE idempotency_keys
         SET status = 'completed', response_status = $4, response_json = $5::jsonb, completed_at = now()
         WHERE tenant_id = $1 AND route_key = $2 AND idempotency_key = $3 AND status = 'processing'`,
        [this.tenantId, routeKey, idempotencyKey, response.statusCode, responseJson],
      );
      return { ...response, replayed: false };
    });
  }
}
