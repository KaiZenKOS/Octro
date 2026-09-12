import type { EconomicEvent } from "@octro/contracts";
import { IdempotencyConflictError } from "../../errors.js";
import type { EconomicEventRepository } from "../../ports/economic-event-repository.js";

// Doublure explicite (S1/S2), remplacee par l'adaptateur PostgreSQL avec
// import/dedoublonnage en S3 (DATA-01).
export class InMemoryEconomicEventRepository implements EconomicEventRepository {
  private readonly events: EconomicEvent[] = [];
  private readonly bySource = new Map<string, EconomicEvent>();

  async save(event: EconomicEvent): Promise<EconomicEvent> {
    const key = `${event.tenant_id}\u0000${event.connection_ref ?? ""}\u0000${event.source_event_id}`;
    const previous = this.bySource.get(key);
    if (previous) {
      const fingerprint = (candidate: EconomicEvent): string => JSON.stringify({
        tenant_id: candidate.tenant_id,
        connection_ref: candidate.connection_ref,
        source_event_id: candidate.source_event_id,
        direction: candidate.direction,
        amount: candidate.amount,
        status: candidate.status,
        verification: candidate.verification,
        label: candidate.label,
        occurred_at: candidate.occurred_at,
        expected_settlement_at: candidate.expected_settlement_at,
        raw_object_ref: candidate.raw_object_ref,
      });
      if (fingerprint(previous) !== fingerprint(event)) throw new IdempotencyConflictError();
      return previous;
    }
    this.bySource.set(key, event);
    this.events.push(event);
    return event;
  }

  async listByTenant(tenantId: string): Promise<EconomicEvent[]> {
    return this.events.filter((event) => event.tenant_id === tenantId);
  }
}
