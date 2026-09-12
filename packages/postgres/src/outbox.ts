import { inWorkspaceTransaction, type SqlClient, type SqlPool } from "./sql.js";

export interface OutboxMessage {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: unknown;
  attempts: number;
  created_at: string;
}

export interface NewOutboxMessage {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: unknown;
}

interface DbOutboxMessage extends Record<string, unknown> {
  id: string; tenant_id: string; event_type: string; payload_json: unknown;
  attempts: number; created_at: Date | string; lock_token: string;
}

export interface ClaimedOutboxMessage extends OutboxMessage {
  lock_token: string;
}

function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Called with the same SQL transaction client as the domain mutation (CDC ch.22). */
export async function enqueueOutboxInTransaction(client: SqlClient, message: NewOutboxMessage): Promise<void> {
  await client.query(
    `INSERT INTO outbox_events (id, tenant_id, event_type, payload_json)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [message.id, message.tenant_id, message.event_type, JSON.stringify(message.payload)],
  );
}

export class PostgresOutboxRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async enqueue(message: NewOutboxMessage): Promise<void> {
    if (message.tenant_id !== this.tenantId) throw new Error("SEC-01: outbox Workspace scope mismatch");
    await inWorkspaceTransaction(this.pool, this.tenantId, (client) => enqueueOutboxInTransaction(client, message));
  }

  async claimBatch(limit: number, leaseSeconds: number, lockToken: string): Promise<ClaimedOutboxMessage[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("outbox batch limit must be 1..100");
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600) throw new RangeError("leaseSeconds must be 1..3600");
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const result = await client.query<DbOutboxMessage>(
        `WITH ready AS (
          SELECT id
          FROM outbox_events
          WHERE tenant_id = $1 AND delivered_at IS NULL AND dead_lettered_at IS NULL
            AND available_at <= now() AND (locked_until IS NULL OR locked_until < now())
          ORDER BY available_at, created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT $2
        )
        UPDATE outbox_events AS outbox
        SET lock_token = $3, locked_until = now() + ($4 * interval '1 second'), attempts = outbox.attempts + 1
        FROM ready
        WHERE outbox.tenant_id = $1 AND outbox.id = ready.id
        RETURNING outbox.id, outbox.tenant_id, outbox.event_type, outbox.payload_json,
          outbox.attempts, outbox.created_at, outbox.lock_token`,
        [this.tenantId, limit, lockToken, leaseSeconds],
      );
      return result.rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        event_type: row.event_type,
        payload: row.payload_json,
        attempts: row.attempts,
        created_at: isoDate(row.created_at),
        lock_token: row.lock_token,
      }));
    });
  }

  async markDelivered(id: string, lockToken: string): Promise<boolean> {
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const result = await client.query(
        `UPDATE outbox_events SET delivered_at = now(), lock_token = NULL, locked_until = NULL
         WHERE tenant_id = $1 AND id = $2 AND lock_token = $3 AND delivered_at IS NULL AND dead_lettered_at IS NULL`,
        [this.tenantId, id, lockToken],
      );
      return result.rowCount === 1;
    });
  }

  async markFailed(id: string, lockToken: string, delaySeconds: number, maxAttempts: number, errorCode: string): Promise<boolean> {
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) throw new RangeError("retry delay must be non-negative");
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError("maxAttempts must be positive");
    const safeCode = errorCode.replace(/[^A-Z0-9_.-]/gi, "_").slice(0, 120) || "HANDLER_FAILED";
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const result = await client.query(
        `UPDATE outbox_events
         SET available_at = CASE WHEN attempts >= $5 THEN available_at ELSE now() + ($4 * interval '1 second') END,
             dead_lettered_at = CASE WHEN attempts >= $5 THEN now() ELSE NULL END,
             last_error_code = $6, lock_token = NULL, locked_until = NULL
         WHERE tenant_id = $1 AND id = $2 AND lock_token = $3 AND delivered_at IS NULL AND dead_lettered_at IS NULL`,
        [this.tenantId, id, lockToken, delaySeconds, maxAttempts, safeCode],
      );
      return result.rowCount === 1;
    });
  }
}
