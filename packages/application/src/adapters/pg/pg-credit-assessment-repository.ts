import type { CreditAssessment, CreditDecision, CreditGrade } from "@octro/contracts";
import type { Pool } from "pg";
import type { CreditAssessmentRepository } from "../../ports/credit-assessment-repository.js";

interface CreditAssessmentRow {
  id: string;
  user_id: string;
  odoo_connection_id: string;
  generated_at: Date;
  composite_score: number;
  grade: CreditGrade;
  decision: CreditDecision;
  recommended_credit_line_amount_decimal: string;
  recommended_credit_line_asset_id: string;
  term_months: number;
  indicative_annual_rate_pct: number;
  details: { risk_notes?: string[] } & Record<string, unknown>;
}

function toDTO(row: CreditAssessmentRow): CreditAssessment {
  const { risk_notes, ...details } = row.details ?? {};
  return {
    id: row.id,
    user_id: row.user_id,
    odoo_connection_id: row.odoo_connection_id,
    generated_at: row.generated_at.toISOString(),
    composite_score: row.composite_score,
    grade: row.grade,
    decision: row.decision,
    max_recommended_credit_line: {
      amount_decimal: row.recommended_credit_line_amount_decimal,
      asset_id: row.recommended_credit_line_asset_id,
    },
    term_months: row.term_months,
    indicative_annual_rate_pct: row.indicative_annual_rate_pct,
    risk_notes: risk_notes ?? [],
    details,
  };
}

// La colonne `details` (jsonb) porte aussi risk_notes : pas de colonne
// dediee dans le schema minimal (Phase C) ; extrait/replie a la lecture.
export class PgCreditAssessmentRepository implements CreditAssessmentRepository {
  constructor(private readonly pool: Pool) {}

  async save(assessment: CreditAssessment): Promise<void> {
    await this.pool.query(
      `INSERT INTO credit_assessments
         (id, user_id, odoo_connection_id, generated_at, composite_score, grade, decision,
          recommended_credit_line_amount_decimal, recommended_credit_line_asset_id,
          term_months, indicative_annual_rate_pct, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        assessment.id,
        assessment.user_id,
        assessment.odoo_connection_id,
        assessment.generated_at,
        assessment.composite_score,
        assessment.grade,
        assessment.decision,
        assessment.max_recommended_credit_line.amount_decimal,
        assessment.max_recommended_credit_line.asset_id,
        assessment.term_months,
        assessment.indicative_annual_rate_pct,
        JSON.stringify({ ...assessment.details, risk_notes: assessment.risk_notes }),
      ],
    );
  }

  async findLatestByUserId(userId: string): Promise<CreditAssessment | null> {
    const { rows } = await this.pool.query<CreditAssessmentRow>(
      "SELECT * FROM credit_assessments WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1",
      [userId],
    );
    return rows[0] ? toDTO(rows[0]) : null;
  }
}
