import type { KycStatus } from "@octro/contracts";
import type { KycStatusRepository } from "../../ports/kyc-status-repository.js";

// Doublure explicite (Phase B), remplacee par l'adaptateur PostgreSQL en
// Phase C. Ne conserve rien entre deux processus.
export class InMemoryKycStatusRepository implements KycStatusRepository {
  private readonly byUserId = new Map<string, KycStatus>();

  async save(status: KycStatus): Promise<void> {
    this.byUserId.set(status.user_id, status);
  }

  async findByUserId(userId: string): Promise<KycStatus | null> {
    return this.byUserId.get(userId) ?? null;
  }
}
