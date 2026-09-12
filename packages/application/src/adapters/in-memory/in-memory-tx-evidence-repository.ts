import type { TxEvidenceEntry, TxEvidenceRepository } from "../../ports/tx-evidence-repository.js";

// Doublure de test/dev : jamais un vrai appel Mongo. Utilisee tant que
// MONGODB_ENABLED n'est pas "true" (voir composition.ts).
export class InMemoryTxEvidenceRepository implements TxEvidenceRepository {
  readonly entries: TxEvidenceEntry[] = [];

  async record(entry: TxEvidenceEntry): Promise<void> {
    this.entries.push(entry);
  }
}
