import type { LoanPosition } from "@octro/contracts";
import type { LendingV1Port } from "@octro/xrpl";
import { assertKycValid } from "@octro/domain";
import { AccessDeniedError } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import { parseLendingAssetId } from "../lending-asset.js";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LoanPositionRepository } from "../ports/loan-position-repository.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import { assertReady } from "../xrpl-support.js";

export interface RepayLoanCommand {
  userId: string;
  loanId: string;
  amountDrops: string;
}

// Wrapper fin de LendingV1Port.repayLoan (Flags=0, jamais tfLoanFullPayment
// — voir packages/xrpl/src/lending-v1.ts). N'accepte de rembourser que le
// propre emprunt du demandeur. amountDrops est converti selon l'actif du
// pret (loan.asset_id) — plain string pour XRP, {currency,issuer,value}
// pour un IOU (integration xrpl-lending-sim).
export class RepayLoanUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly wallets: WalletRepository,
    private readonly loans: LoanPositionRepository,
    private readonly lending: LendingV1Port,
    private readonly crypto: CryptoPort,
    private readonly txEvidence: TxEvidenceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: RepayLoanCommand): Promise<LoanPosition> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const loan = await this.loans.findById(command.loanId);
    if (!loan) throw new NotFoundError("LoanPosition", command.loanId);
    if (loan.borrower_user_id !== command.userId) throw new AccessDeniedError("cannot repay another borrower's loan");

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundError("Wallet", command.userId);

    const asset = parseLendingAssetId(loan.asset_id);
    const borrowerSeed = await this.crypto.decrypt(wallet.seedCiphertext);
    const { evidence } = assertReady(
      await this.lending.repayLoan({
        borrowerSeed,
        loanId: loan.loan_id ?? "",
        amountDrops: asset.toLedgerAmount(command.amountDrops),
      }),
    );
    await this.txEvidence.record({
      userId: command.userId,
      assetId: loan.asset_id,
      operation: "repay_loan",
      evidence: evidence as unknown as Record<string, unknown>,
      recordedAt: this.clock.now(),
    });

    const repaid: LoanPosition = { ...loan, status: "repaid", tx_evidence: evidence as unknown as Record<string, unknown> };
    await this.loans.save(repaid);
    return repaid;
  }
}
