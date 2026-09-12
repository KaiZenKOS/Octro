import type { CreditAssessment } from "@octro/contracts";
import { NotFoundError } from "../errors.js";
import type { CreditAssessmentRepository } from "../ports/credit-assessment-repository.js";

export interface GetLatestCreditAssessmentQuery {
  userId: string;
}

export class GetLatestCreditAssessmentUseCase {
  constructor(private readonly creditAssessments: CreditAssessmentRepository) {}

  async execute(query: GetLatestCreditAssessmentQuery): Promise<CreditAssessment> {
    const assessment = await this.creditAssessments.findLatestByUserId(query.userId);
    if (!assessment) {
      throw new NotFoundError("CreditAssessment", query.userId);
    }
    return assessment;
  }
}
