import { inWorkspaceTransaction, type SqlPool } from "./sql.js";

export interface AuditEventInput {
  id: string;
  tenant_id: string;
  occurred_at: string;
  actor_user_id?: string;
  action: string;
  plan_id?: string;
  approval_id?: string;
  execution_id?: string;
  plan_hash?: string;
  ledger_tx_hash?: string;
  metadata?: Record<string, unknown>;
}

/** Immutable audit append correlated to the exact plan, approval, execution and observed hash. */
export class PostgresAuditRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async append(event: AuditEventInput): Promise<void> {
    if (event.tenant_id !== this.tenantId) throw new Error("SEC-01: audit Workspace scope mismatch");
    if (event.approval_id && !event.plan_id) throw new Error("OPS-01: an approval audit entry must identify its plan");
    if (event.execution_id && !event.plan_id) throw new Error("OPS-01: an execution audit entry must identify its plan");
    if (event.plan_id && !event.plan_hash) throw new Error("OPS-01: an audit event linked to a plan must carry its immutable hash");
    if (event.ledger_tx_hash && !event.execution_id) throw new Error("OPS-01: ledger hash must be correlated to an execution");

    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      if (event.plan_id) {
        const plan = await client.query<{ plan_hash: string }>(
          "SELECT plan_hash FROM plans WHERE tenant_id = $1 AND id = $2",
          [this.tenantId, event.plan_id],
        );
        if (!plan.rows[0]) throw new Error("OPS-01: audit plan does not exist in this Workspace");
        if (event.plan_hash !== plan.rows[0].plan_hash) {
          throw new Error("OPS-01: audit plan_hash does not match the immutable plan");
        }
        if (event.approval_id) {
          const approval = await client.query<{ plan_version: number }>(
            "SELECT plan_version FROM approvals WHERE tenant_id = $1 AND plan_id = $2 AND id = $3",
            [this.tenantId, event.plan_id, event.approval_id],
          );
          if (!approval.rows[0]) throw new Error("OPS-01: approval does not reference this plan in this Workspace");
        }
        if (event.execution_id) {
          const execution = await client.query<{ approval_id: string | null; ledger_tx_hash: string | null }>(
            "SELECT approval_id, ledger_tx_hash FROM executions WHERE tenant_id = $1 AND plan_id = $2 AND id = $3",
            [this.tenantId, event.plan_id, event.execution_id],
          );
          const row = execution.rows[0];
          if (!row) throw new Error("OPS-01: execution does not reference this plan in this Workspace");
          if ((event.approval_id ?? null) !== row.approval_id) {
            throw new Error("OPS-01: execution and audit approval do not correlate");
          }
          if ((event.ledger_tx_hash ?? null) !== row.ledger_tx_hash) {
            throw new Error("OPS-01: audit ledger hash must match the execution evidence (null is valid before inclusion)");
          }
        }
      }

      await client.query(
        `INSERT INTO audit_events (
          id, tenant_id, occurred_at, actor_user_id, action, plan_id, approval_id,
          execution_id, plan_hash, ledger_tx_hash, metadata_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [event.id, event.tenant_id, event.occurred_at, event.actor_user_id ?? null, event.action,
          event.plan_id ?? null, event.approval_id ?? null, event.execution_id ?? null,
          event.plan_hash ?? null, event.ledger_tx_hash ?? null, JSON.stringify(event.metadata ?? {})],
      );
    });
  }
}
