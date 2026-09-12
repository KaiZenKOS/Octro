import type { CreditAssessment } from "@octro/contracts";

export interface CreditAssessmentRepository {
  save(assessment: CreditAssessment): Promise<void>;
  findLatestByUserId(userId: string): Promise<CreditAssessment | null>;
}
