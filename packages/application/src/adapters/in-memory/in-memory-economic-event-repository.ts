import type { EconomicEvent } from "@octro/contracts";
import type { EconomicEventRepository } from "../../ports/economic-event-repository.js";

// Doublure explicite (S1/S2), remplacee par l'adaptateur PostgreSQL avec
// import/dedoublonnage en S3 (DATA-01).
export class InMemoryEconomicEventRepository implements EconomicEventRepository {
  private readonly events: EconomicEvent[] = [];

  async save(event: EconomicEvent): Promise<void> {
    this.events.push(event);
  }

  async listByTenant(tenantId: string): Promise<EconomicEvent[]> {
    return this.events.filter((event) => event.tenant_id === tenantId);
  }
}
