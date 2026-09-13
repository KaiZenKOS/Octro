import type { EmailVerificationPurpose } from "@octro/contracts";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
} from "../../ports/email-verification-repository.js";

// Doublure explicite (Phase A), remplacee par l'adaptateur PostgreSQL en
// Phase C. Ne conserve rien entre deux processus.
export class InMemoryEmailVerificationRepository implements EmailVerificationRepository {
  private readonly records: EmailVerificationRecord[] = [];

  async save(record: EmailVerificationRecord): Promise<void> {
    const index = this.records.findIndex((r) => r.id === record.id);
    if (index === -1) this.records.push(record);
    else this.records[index] = record;
  }

  async findLatestActiveForUser(
    userId: string,
    purpose: EmailVerificationPurpose,
  ): Promise<EmailVerificationRecord | null> {
    const active = this.records.filter(
      (r) => r.userId === userId && r.purpose === purpose && r.consumedAt === null,
    );
    return active.length > 0 ? active[active.length - 1]! : null;
  }
}
