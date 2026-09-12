import type { CreditAssessment } from "@octro/contracts";
import { assessCredit } from "@octro/credit";
import { assertKycValid } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { CreditAssessmentRepository } from "../ports/credit-assessment-repository.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { OdooConnectionRepository } from "../ports/odoo-connection-repository.js";
import type { OdooPort } from "../ports/odoo-port.js";

const LOOKBACK_MONTHS = 12;
const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

export interface RequestCreditAssessmentCommand {
  userId: string;
  odooConnectionId: string;
  // Requis des que plusieurs societes sont accessibles a la cle API (voir
  // ListOdooCompaniesUseCase) ; sinon la societe par defaut est utilisee.
  companyId?: number;
}

// PER-11 : KYC valide requis. Charge la connexion Odoo BYO de l'utilisateur
// (jamais celle d'un autre — NotFoundError sinon, pas de fuite d'existence
// via un 403 distinct), dechiffre la cle transitoirement, appelle OdooPort
// puis @octro/credit (pur, sans I/O), persiste et renvoie le DTO complet.
export class RequestCreditAssessmentUseCase {
  constructor(
    private readonly odooConnections: OdooConnectionRepository,
    private readonly creditAssessments: CreditAssessmentRepository,
    private readonly kycStatuses: KycStatusRepository,
    private readonly odoo: OdooPort,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: RequestCreditAssessmentCommand): Promise<CreditAssessment> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const connection = await this.odooConnections.findById(command.odooConnectionId);
    if (!connection || connection.userId !== command.userId) {
      throw new NotFoundError("OdooConnection", command.odooConnectionId);
    }

    const now = this.clock.now();
    const sinceDate = new Date(now.getTime() - LOOKBACK_MONTHS * MS_PER_MONTH).toISOString().slice(0, 10);
    const apiKey = await this.crypto.decrypt(connection.apiKeyCiphertext);

    const raw = await this.odoo.fetchCreditInputs({
      odooUrl: connection.odooUrl,
      odooDb: connection.odooDb,
      apiKey,
      sinceDate,
      ...(command.companyId !== undefined ? { companyId: command.companyId } : {}),
    });
    const result = assessCredit(raw);

    const assessment: CreditAssessment = {
      id: this.ids.newId(),
      user_id: command.userId,
      odoo_connection_id: connection.id,
      generated_at: now.toISOString(),
      composite_score: result.riskAssessment.compositeScore,
      grade: result.riskAssessment.riskGrade,
      decision: result.creditRecommendation.decision,
      max_recommended_credit_line: {
        amount_decimal: result.creditRecommendation.maxRecommendedCreditLine.toFixed(2),
        asset_id: `fiat:${raw.company.currency}`,
      },
      term_months: result.creditRecommendation.suggestedTermMonths,
      indicative_annual_rate_pct: result.creditRecommendation.suggestedIndicativeAnnualRatePct,
      risk_notes: result.riskNotes,
      details: { ...result },
    };
    await this.creditAssessments.save(assessment);
    await this.odooConnections.save({ ...connection, lastUsedAt: now });
    return assessment;
  }
}
