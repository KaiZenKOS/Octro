import type { LoanPosition } from "@octro/contracts";
import type { LendingV1Port } from "@octro/xrpl";
import { assertCreditApproved, assertKycValid } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { CreditAssessmentRepository } from "../ports/credit-assessment-repository.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { LoanPositionRepository } from "../ports/loan-position-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import { assertReady } from "../xrpl-support.js";

const DEFAULT_PAYMENT_INTERVAL_SECONDS = 30 * 24 * 60 * 60; // mensuel, >= 60s (contrainte LoanSet)
const DEFAULT_PAYMENT_TOTAL = 1;
const DEFAULT_GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60;
// Simplification hackathon documentee (aucun oracle FX branche) : 1 unite
// de la devise de l'evaluation de credit (ex. fiat:EUR) == 1 XRP. A
// remplacer par un vrai taux de change avant tout usage hors demo.
const DROPS_PER_FIAT_UNIT = 1_000_000n;

export interface BorrowerLoanRequestCommand {
  userId: string;
  // Optionnel : le borrower peut demander moins que le plafond recommande
  // par sa derniere evaluation de credit ; jamais plus (plafonne ici).
  requestedPrincipalDrops?: string;
}

// PER-11 + decision actee : KYC valide ET derniere evaluation de credit
// approuvee (assertCreditApproved) requis avant tout emprunt. Emprunte
// aupres du loan broker partage (decision actee) ; le calendrier de
// paiement reste un remboursement en une fois (PaymentTotal=1) — rejouer un
// vrai calendrier multi-echeances est une limite documentee (l'echeancier
// deterministe complet reste le role de services/optimizer, pas de ce
// chemin de production).
export class BorrowerLoanRequestUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly creditAssessments: CreditAssessmentRepository,
    private readonly wallets: WalletRepository,
    private readonly pools: LendingPoolRepository,
    private readonly loans: LoanPositionRepository,
    private readonly lending: LendingV1Port,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: BorrowerLoanRequestCommand): Promise<LoanPosition> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const assessment = await this.creditAssessments.findLatestByUserId(command.userId);
    if (!assessment) throw new NotFoundError("CreditAssessment", command.userId);
    assertCreditApproved(assessment.decision);

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundError("Wallet", command.userId);

    const pool = await this.pools.get();
    if (!pool) throw new NotFoundError("LendingPool", "shared");

    const maxPrincipalDrops =
      BigInt(Math.max(0, Math.floor(Number(assessment.max_recommended_credit_line.amount_decimal)))) * DROPS_PER_FIAT_UNIT;
    const requestedDrops = command.requestedPrincipalDrops ? BigInt(command.requestedPrincipalDrops) : maxPrincipalDrops;
    const principalDrops = (requestedDrops > maxPrincipalDrops ? maxPrincipalDrops : requestedDrops).toString();

    const interestRateHundredThousandths = Math.round(assessment.indicative_annual_rate_pct * 1000);
    const brokerOwnerSeed = await this.crypto.decrypt(pool.ownerSeedCiphertext);
    const borrowerSeed = await this.crypto.decrypt(wallet.seedCiphertext);

    const { data, evidence } = assertReady(
      await this.lending.acceptLoan({
        borrowerSeed,
        brokerOwnerSeed,
        loanBrokerId: pool.loanBrokerId,
        principalDrops,
        interestRateHundredThousandths,
        paymentIntervalSeconds: DEFAULT_PAYMENT_INTERVAL_SECONDS,
        paymentTotal: DEFAULT_PAYMENT_TOTAL,
        gracePeriodSeconds: DEFAULT_GRACE_PERIOD_SECONDS,
      }),
    );

    const loan: LoanPosition = {
      id: this.ids.newId(),
      borrower_user_id: command.userId,
      credit_assessment_id: assessment.id,
      loan_broker_id: pool.loanBrokerId,
      loan_id: data.loanId,
      principal_drops: principalDrops,
      interest_rate_hundred_thousandths: interestRateHundredThousandths,
      payment_interval_seconds: DEFAULT_PAYMENT_INTERVAL_SECONDS,
      payment_total: DEFAULT_PAYMENT_TOTAL,
      grace_period_seconds: DEFAULT_GRACE_PERIOD_SECONDS,
      status: "active",
      tx_evidence: evidence as unknown as Record<string, unknown>,
      created_at: this.clock.now().toISOString(),
    };
    await this.loans.save(loan);
    return loan;
  }
}
