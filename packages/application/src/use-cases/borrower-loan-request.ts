import type { LoanPosition } from "@octro/contracts";
import type { IouSetupPort, LendingV1Port } from "@octro/xrpl";
import { assertCreditApproved, assertKycValid } from "@octro/domain";
import { compareDecimal } from "../decimal-support.js";
import { NotFoundError } from "../errors.js";
import { parseLendingAssetId, toNativeAmount } from "../lending-asset.js";
import type { Clock } from "../ports/clock.js";
import type { CreditAssessmentRepository } from "../ports/credit-assessment-repository.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { LoanPositionRepository } from "../ports/loan-position-repository.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import { ensureTrustline } from "../trustline-support.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import { assertReady } from "../xrpl-support.js";

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // mensuel, meme convention que precedemment (>= 60s, contrainte LoanSet)
const DEFAULT_PAYMENT_TOTAL = 1;
const DEFAULT_GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_ASSET_ID = "xrpl:XRP";

export interface BorrowerLoanRequestCommand {
  userId: string;
  // "xrpl:XRP" par defaut ; "xrpl:RLUSD:<issuer>" pour l'IOU simule.
  assetId?: string;
  // Montant precis demande par le borrower (unite native de l'actif —
  // drops pour XRP, valeur decimale pour un IOU comme RLUSD simule),
  // plafonne au montant maximal recommande par la derniere evaluation de
  // credit — jamais plus. Le borrower choisit explicitement ce montant,
  // il n'est plus jamais fixe implicitement au plafond (decision actee).
  requestedPrincipalDrops: string;
  // Duree souhaitee en mois, plafonnee a assessment.term_months — jamais
  // plus. Determine PaymentInterval (le pret reste un remboursement en
  // une fois, PaymentTotal=1 — limite documentee).
  requestedTermMonths: number;
}

// PER-11 + decision actee : KYC valide ET derniere evaluation de credit
// approuvee (assertCreditApproved) requis avant tout emprunt. Emprunte
// aupres du loan broker partage (decision actee) ; le calendrier de
// paiement reste un remboursement en une fois (PaymentTotal=1) — rejouer un
// vrai calendrier multi-echeances est une limite documentee (l'echeancier
// deterministe complet reste le role de services/optimizer, pas de ce
// chemin de production). Le montant et la duree sont desormais des choix
// explicites du borrower (jamais implicitement le plafond recommande) —
// seulement plafonnes, jamais imposes.
export class BorrowerLoanRequestUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly creditAssessments: CreditAssessmentRepository,
    private readonly wallets: WalletRepository,
    private readonly pools: LendingPoolRepository,
    private readonly loans: LoanPositionRepository,
    private readonly lending: LendingV1Port,
    private readonly iouSetup: IouSetupPort,
    private readonly crypto: CryptoPort,
    private readonly txEvidence: TxEvidenceRepository,
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

    const assetId = command.assetId ?? DEFAULT_ASSET_ID;
    const asset = parseLendingAssetId(assetId);
    const pool = await this.pools.getByAssetId(assetId);
    if (!pool) throw new NotFoundError("LendingPool", assetId);

    // Le plafond recommande (max_recommended_credit_line) est exprime en
    // unite "humaine" de l'actif (ex. "5000" = 5000 XRP ou 5000 RLUSD) —
    // converti en unite native (drops pour XRP) avant toute comparaison,
    // jamais compare tel quel a une valeur deja native (bug corrige :
    // l'ancienne mise a l'echelle *1e6 s'appliquait a tort a un IOU aussi).
    const maxPrincipal = toNativeAmount(assetId, assessment.max_recommended_credit_line.amount_decimal);
    const principalDrops =
      compareDecimal(command.requestedPrincipalDrops, maxPrincipal) > 0 ? maxPrincipal : command.requestedPrincipalDrops;

    const maxTermMonths = Math.max(1, Math.floor(assessment.term_months));
    const termMonths = Math.min(Math.max(1, Math.floor(command.requestedTermMonths)), maxTermMonths);
    const paymentIntervalSeconds = termMonths * SECONDS_PER_MONTH;

    const interestRateHundredThousandths = Math.round(assessment.indicative_annual_rate_pct * 1000);
    const brokerOwnerSeed = await this.crypto.decrypt(pool.ownerSeedCiphertext);
    const borrowerSeed = await this.crypto.decrypt(wallet.seedCiphertext);
    // Le principal est verse au borrower : la trustline doit exister avant
    // le LoanSet pour un actif IOU (integration xrpl-lending-sim).
    await ensureTrustline(asset, borrowerSeed, this.iouSetup);

    const { data, evidence } = assertReady(
      await this.lending.acceptLoan({
        borrowerSeed,
        brokerOwnerSeed,
        loanBrokerId: pool.loanBrokerId,
        principalDrops,
        interestRateHundredThousandths,
        paymentIntervalSeconds,
        paymentTotal: DEFAULT_PAYMENT_TOTAL,
        gracePeriodSeconds: DEFAULT_GRACE_PERIOD_SECONDS,
      }),
    );
    await this.txEvidence.record({
      userId: command.userId,
      assetId,
      operation: "borrower_loan_request",
      evidence: evidence as unknown as Record<string, unknown>,
      recordedAt: this.clock.now(),
    });

    const loan: LoanPosition = {
      id: this.ids.newId(),
      borrower_user_id: command.userId,
      credit_assessment_id: assessment.id,
      loan_broker_id: pool.loanBrokerId,
      loan_id: data.loanId,
      asset_id: assetId,
      principal_drops: principalDrops,
      interest_rate_hundred_thousandths: interestRateHundredThousandths,
      payment_interval_seconds: paymentIntervalSeconds,
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
