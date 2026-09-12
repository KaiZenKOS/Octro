import type { Pool } from "pg";
import type { EconomicEvent, EventDirection, EventStatus, Verification } from "@octro/contracts";
import type { EconomicEventRepository } from "../../ports/economic-event-repository.js";

interface EconomicEventRow {
  id: string;
  tenant_id: string;
  source_event_id: string;
  connection_ref: string | null;
  direction: string;
  amount_decimal: string;
  asset_id: string;
  status: string;
  verification: string;
  label: string;
  occurred_at: Date | null;
  observed_at: Date;
  expected_settlement_at: Date | null;
  raw_object_ref: string | null;
}

function toDTO(row: EconomicEventRow): EconomicEvent {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    source_event_id: row.source_event_id,
    ...(row.connection_ref !== null ? { connection_ref: row.connection_ref } : {}),
    direction: row.direction as EventDirection,
    amount: {
      amount_decimal: row.amount_decimal,
      asset_id: row.asset_id,
    },
    status: row.status as EventStatus,
    verification: row.verification as Verification,
    label: row.label,
    ...(row.occurred_at !== null ? { occurred_at: row.occurred_at.toISOString() } : {}),
    observed_at: row.observed_at.toISOString(),
    ...(row.expected_settlement_at !== null ? { expected_settlement_at: row.expected_settlement_at.toISOString() } : {}),
    ...(row.raw_object_ref !== null ? { raw_object_ref: row.raw_object_ref } : {}),
  };
}

export class PgEconomicEventRepository implements EconomicEventRepository {
  constructor(private readonly pool: Pool) {}

  async save(event: EconomicEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO economic_events (
        id, tenant_id, source_event_id, connection_ref, direction,
        amount_decimal, asset_id, status, verification, label,
        occurred_at, observed_at, expected_settlement_at, raw_object_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (tenant_id, source_event_id) DO UPDATE SET
        direction = EXCLUDED.direction,
        amount_decimal = EXCLUDED.amount_decimal,
        asset_id = EXCLUDED.asset_id,
        status = EXCLUDED.status,
        verification = EXCLUDED.verification,
        label = EXCLUDED.label,
        occurred_at = EXCLUDED.occurred_at,
        observed_at = EXCLUDED.observed_at,
        expected_settlement_at = EXCLUDED.expected_settlement_at,
        raw_object_ref = EXCLUDED.raw_object_ref`,
      [
        event.id,
        event.tenant_id,
        event.source_event_id,
        event.connection_ref ?? null,
        event.direction,
        event.amount.amount_decimal,
        event.amount.asset_id,
        event.status,
        event.verification,
        event.label,
        event.occurred_at ? new Date(event.occurred_at) : null,
        new Date(event.observed_at),
        event.expected_settlement_at ? new Date(event.expected_settlement_at) : null,
        event.raw_object_ref ?? null,
      ],
    );
  }

  async listByTenant(tenantId: string): Promise<EconomicEvent[]> {
    const { rows } = await this.pool.query<EconomicEventRow>(
      `SELECT * FROM economic_events 
       WHERE tenant_id = $1 
       ORDER BY expected_settlement_at ASC NULLS LAST, observed_at ASC`,
      [tenantId],
    );
    return rows.map(toDTO);
  }
}
