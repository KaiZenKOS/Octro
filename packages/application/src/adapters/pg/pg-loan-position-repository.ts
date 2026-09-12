import type { LoanPosition, LoanStatus } from "@octro/contracts";
import type { Pool } from "pg";
import type { LoanPositionRepository } from "../../ports/loan-position-repository.js";

interface LoanPositionRow {
  id: string;
  borrower_user_id: string;
  credit_assessment_id: string;
  loan_broker_id: string;
  loan_id: string;
  principal_drops: string;
  interest_rate: number;
  payment_interval_seconds: number;
  payment_total: number;
  grace_period_seconds: number;
  status: LoanStatus;
  tx_evidence: Record<string, unknown> | null;
  created_at: Date;
}

function toDTO(row: LoanPositionRow): LoanPosition {
  return {
    id: row.id,
    borrower_user_id: row.borrower_user_id,
    credit_assessment_id: row.credit_assessment_id,
    loan_broker_id: row.loan_broker_id,
    loan_id: row.loan_id,
    principal_drops: row.principal_drops,
    interest_rate_hundred_thousandths: row.interest_rate,
    payment_interval_seconds: row.payment_interval_seconds,
    payment_total: row.payment_total,
    grace_period_seconds: row.grace_period_seconds,
    status: row.status,
    tx_evidence: row.tx_evidence,
    created_at: row.created_at.toISOString(),
  };
}

export class PgLoanPositionRepository implements LoanPositionRepository {
  constructor(private readonly pool: Pool) {}

  async save(loan: LoanPosition): Promise<void> {
    await this.pool.query(
      `INSERT INTO loan_positions
         (id, borrower_user_id, credit_assessment_id, loan_broker_id, loan_id, principal_drops,
          interest_rate, payment_interval_seconds, payment_total, grace_period_seconds, status,
          tx_evidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, tx_evidence = EXCLUDED.tx_evidence`,
      [
        loan.id,
        loan.borrower_user_id,
        loan.credit_assessment_id,
        loan.loan_broker_id,
        loan.loan_id,
        loan.principal_drops,
        loan.interest_rate_hundred_thousandths,
        loan.payment_interval_seconds,
        loan.payment_total,
        loan.grace_period_seconds,
        loan.status,
        loan.tx_evidence ? JSON.stringify(loan.tx_evidence) : null,
        loan.created_at,
      ],
    );
  }

  async findByBorrowerUserId(userId: string): Promise<LoanPosition[]> {
    const { rows } = await this.pool.query<LoanPositionRow>(
      "SELECT * FROM loan_positions WHERE borrower_user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toDTO);
  }

  async findById(id: string): Promise<LoanPosition | null> {
    const { rows } = await this.pool.query<LoanPositionRow>("SELECT * FROM loan_positions WHERE id = $1", [id]);
    return rows[0] ? toDTO(rows[0]) : null;
  }
}
