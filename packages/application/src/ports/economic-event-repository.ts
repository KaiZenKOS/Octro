import type { EconomicEvent } from "@octro/contracts";

// Port de persistance des evenements (S1 pour le port, S3 pour l'adaptateur
// reel avec import/dedoublonnage). tenant_id est aussi l'identifiant du
// Workspace (docs/architecture.md) : toute lecture le filtre (SEC-01). La
// doublure en memoire (adapters/in-memory) l'applique deja, sans attendre S3.
export interface EconomicEventRepository {
  save(event: EconomicEvent): Promise<void>;
  listByTenant(tenantId: string): Promise<EconomicEvent[]>;
}
