import type { OdooConnectionRecord, OdooConnectionRepository } from "../../ports/odoo-connection-repository.js";

// Doublure explicite (Phase D), remplacee par l'adaptateur PostgreSQL en
// Phase C/D. Ne conserve rien entre deux processus.
export class InMemoryOdooConnectionRepository implements OdooConnectionRepository {
  private readonly byId = new Map<string, OdooConnectionRecord>();

  async save(connection: OdooConnectionRecord): Promise<void> {
    this.byId.set(connection.id, connection);
  }

  async findById(id: string): Promise<OdooConnectionRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<OdooConnectionRecord[]> {
    return [...this.byId.values()].filter((c) => c.userId === userId);
  }
}
