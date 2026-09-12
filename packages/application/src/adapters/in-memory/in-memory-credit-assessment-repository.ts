import type { CreditAssessment } from "@octro/contracts";
import type { CreditAssessmentRepository } from "../../ports/credit-assessment-repository.js";

// Doublure explicite (Phase D), remplacee par l'adaptateur PostgreSQL en
// Phase C/D. Ne conserve rien entre deux processus.
export class InMemoryCreditAssessmentRepository implements CreditAssessmentRepository {
  private readonly byUserId = new Map<string, CreditAssessment[]>();

  async save(assessment: CreditAssessment): Promise<void> {
    const list = this.byUserId.get(assessment.user_id) ?? [];
    list.push(assessment);
    this.byUserId.set(assessment.user_id, list);
  }

  async findLatestByUserId(userId: string): Promise<CreditAssessment | null> {
    const list = this.byUserId.get(userId);
    return list && list.length > 0 ? list[list.length - 1]! : null;
  }
}
