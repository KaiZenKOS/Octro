import type { EconomicEvent, Workspace, Projection, ActionPlan, Approval, Execution } from "@octro/contracts";
import { IdempotencyConflictError } from "@octro/application";
import type { EconomicEventRepository, WorkspaceRepository } from "@octro/application";
import { assertNumeric38Scale18 } from "./decimal.js";
import { inWorkspaceTransaction, type SqlPool } from "./sql.js";

interface DbWorkspace extends Record<string, unknown> {
  id: string; tenant_id: string; kind: Workspace["kind"]; owner_user_id: string;
  organization_id: string | null; display_name: string; created_at: Date | string;
}

interface DbEconomicEvent extends Record<string, unknown> {
  id: string; tenant_id: string; connection_ref: string | null; source_event_id: string;
  direction: EconomicEvent["direction"]; amount_decimal: string; asset_id: string;
  status: EconomicEvent["status"]; verification: EconomicEvent["verification"];
  label: string; occurred_at: Date | string | null; observed_at: Date | string;
  expected_settlement_at: Date | string | null; raw_object_ref: string | null;
}

function iso(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapWorkspace(row: DbWorkspace): Workspace {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    kind: row.kind,
    owner_user_id: row.owner_user_id,
    ...(row.organization_id ? { organization_id: row.organization_id } : {}),
    display_name: row.display_name,
    created_at: iso(row.created_at)!,
  };
}

function mapEconomicEvent(row: DbEconomicEvent): EconomicEvent {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    source_event_id: row.source_event_id,
    ...(row.connection_ref ? { connection_ref: row.connection_ref } : {}),
    direction: row.direction,
    amount: { amount_decimal: row.amount_decimal, asset_id: row.asset_id },
    status: row.status,
    verification: row.verification,
    label: row.label,
    observed_at: iso(row.observed_at)!,
    ...(iso(row.occurred_at) ? { occurred_at: iso(row.occurred_at) } : {}),
    ...(iso(row.expected_settlement_at) ? { expected_settlement_at: iso(row.expected_settlement_at) } : {}),
    ...(row.raw_object_ref ? { raw_object_ref: row.raw_object_ref } : {}),
  };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function economicEventFingerprint(event: EconomicEvent): string {
  // Align DATA-01 replay semantics with the existing in-memory adapter: an
  // importer may regenerate the local id and observed_at on each delivery.
  return canonical({
    tenant_id: event.tenant_id,
    connection_ref: event.connection_ref,
    source_event_id: event.source_event_id,
    direction: event.direction,
    amount: event.amount,
    status: event.status,
    verification: event.verification,
    label: event.label,
    occurred_at: event.occurred_at,
    expected_settlement_at: event.expected_settlement_at,
    raw_object_ref: event.raw_object_ref,
  });
}

function assertScope(tenantId: string, resourceTenantId: string): void {
  if (tenantId !== resourceTenantId) throw new Error("SEC-01: repository workspace scope mismatch");
}

/** One instance per trusted request/service Workspace scope; RLS is also enabled in SQL. */
export class PostgresWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(workspace: Workspace): Promise<void> {
    assertScope(this.tenantId, workspace.tenant_id);
    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const inserted = await client.query(
        `INSERT INTO workspaces (id, tenant_id, kind, owner_user_id, organization_id, display_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [workspace.id, workspace.tenant_id, workspace.kind, workspace.owner_user_id,
          workspace.organization_id ?? null, workspace.display_name, workspace.created_at],
      );
      if (inserted.rowCount === 1) return;
      const previous = await client.query<DbWorkspace>(
        `SELECT id, tenant_id, kind, owner_user_id, organization_id, display_name, created_at
         FROM workspaces WHERE id = $1 AND tenant_id = $2`,
        [workspace.id, this.tenantId],
      );
      const row = previous.rows[0];
      if (!row || canonical(mapWorkspace(row)) !== canonical(workspace)) {
        throw new Error("SEC-01: Workspace id already exists with different ownership or data");
      }
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const result = await client.query<DbWorkspace>(
        `SELECT id, tenant_id, kind, owner_user_id, organization_id, display_name, created_at
         FROM workspaces WHERE id = $1 AND tenant_id = $2`,
        [id, this.tenantId],
      );
      return result.rows[0] ? mapWorkspace(result.rows[0]) : null;
    });
  }
}

/** DATA-01 uniqueness plus body-equivalence; the insert is race-safe via unique indexes. */
export class PostgresEconomicEventRepository implements EconomicEventRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(event: EconomicEvent): Promise<EconomicEvent> {
    assertScope(this.tenantId, event.tenant_id);
    assertNumeric38Scale18(event.amount.amount_decimal);
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const inserted = await client.query<DbEconomicEvent>(
        `INSERT INTO economic_events (
          id, tenant_id, connection_ref, source_event_id, direction, amount_decimal, asset_id,
          status, verification, label, occurred_at, observed_at, expected_settlement_at, raw_object_ref
        ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING
        RETURNING id, tenant_id, connection_ref, source_event_id, direction, amount_decimal::text AS amount_decimal,
          asset_id, status, verification, label, occurred_at, observed_at, expected_settlement_at, raw_object_ref`,
        [event.id, event.tenant_id, event.connection_ref ?? null, event.source_event_id, event.direction,
          event.amount.amount_decimal, event.amount.asset_id, event.status, event.verification, event.label,
          event.occurred_at ?? null, event.observed_at, event.expected_settlement_at ?? null, event.raw_object_ref ?? null],
      );
      if (inserted.rows[0]) return mapEconomicEvent(inserted.rows[0]);

      const prior = await client.query<DbEconomicEvent>(
        `SELECT id, tenant_id, connection_ref, source_event_id, direction, amount_decimal::text AS amount_decimal,
          asset_id, status, verification, label, occurred_at, observed_at, expected_settlement_at, raw_object_ref
         FROM economic_events WHERE tenant_id = $1 AND source_event_id = $2
          AND connection_ref IS NOT DISTINCT FROM $3 FOR UPDATE`,
        [event.tenant_id, event.source_event_id, event.connection_ref ?? null],
      );
      const existing = prior.rows[0] ? mapEconomicEvent(prior.rows[0]) : null;
      if (!existing) throw new Error("DATA-01: uniqueness conflict without a visible event");
      if (economicEventFingerprint(existing) !== economicEventFingerprint(event)) {
        throw new IdempotencyConflictError("DATA-01: source event id was replayed with a different body");
      }
      return existing;
    });
  }

  async listByTenant(tenantId: string): Promise<EconomicEvent[]> {
    assertScope(this.tenantId, tenantId);
    return inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      const result = await client.query<DbEconomicEvent>(
        `SELECT id, tenant_id, connection_ref, source_event_id, direction, amount_decimal::text AS amount_decimal,
          asset_id, status, verification, label, occurred_at, observed_at, expected_settlement_at, raw_object_ref
         FROM economic_events WHERE tenant_id = $1 ORDER BY observed_at, id`,
        [this.tenantId],
      );
      return result.rows.map(mapEconomicEvent);
    });
  }
}

/** Persist forecast separately from confirmed balances; all numeric values are decimals. */
export class PostgresForecastRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(projection: Projection, request: unknown): Promise<void> {
    assertScope(this.tenantId, projection.tenant_id);
    const quality = projection.data_quality;
    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      await client.query(
        `INSERT INTO forecast_runs (id, tenant_id, generated_at, as_of, horizon_steps, horizon_unit, data_quality, request_json, result_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
        [projection.id, projection.tenant_id, projection.generated_at, projection.as_of,
          projection.horizon.steps, projection.horizon.unit, quality, JSON.stringify(request), JSON.stringify(projection)],
      );
      for (const point of projection.points) {
        assertNumeric38Scale18(point.expected_balance);
        assertNumeric38Scale18(point.confirmed_balance);
        await client.query(
          `INSERT INTO forecast_points (tenant_id, forecast_run_id, step, asset_id, expected_balance, confirmed_balance)
           VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric)`,
          [projection.tenant_id, projection.id, point.t, point.asset_id, point.expected_balance, point.confirmed_balance],
        );
      }
    });
  }
}

export class PostgresPlanRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(plan: ActionPlan): Promise<void> {
    assertScope(this.tenantId, plan.tenant_id);
    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      await client.query(
        `INSERT INTO plans (id, tenant_id, version, status, plan_hash, plan_json, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [plan.id, plan.tenant_id, plan.version, plan.status, plan.plan_hash, JSON.stringify(plan), plan.created_at, plan.expires_at ?? null],
      );
    });
  }
}

export class PostgresApprovalRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(approval: Approval): Promise<void> {
    assertScope(this.tenantId, approval.tenant_id);
    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      await client.query(
        `INSERT INTO approvals (id, tenant_id, plan_id, plan_version, terms_hash, approver_user_id, decision, decided_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [approval.id, approval.tenant_id, approval.plan_id, approval.plan_version, approval.terms_hash,
          approval.approver_user_id, approval.decision, approval.decided_at, approval.expires_at],
      );
    });
  }
}

export class PostgresExecutionRepository {
  constructor(private readonly pool: SqlPool, private readonly tenantId: string) {}

  async save(execution: Execution & { ledger_tx_hash?: string }): Promise<void> {
    assertScope(this.tenantId, execution.tenant_id);
    await inWorkspaceTransaction(this.pool, this.tenantId, async (client) => {
      await client.query(
        `INSERT INTO executions (id, tenant_id, plan_id, approval_id, idempotency_key, kind, outcome, occurred_at, evidence_refs, ledger_tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [execution.id, execution.tenant_id, execution.plan_id, execution.approval_id ?? null, execution.idempotency_key,
          execution.kind, execution.outcome, execution.occurred_at, JSON.stringify(execution.evidence_refs), execution.ledger_tx_hash ?? null],
      );
    });
  }
}
