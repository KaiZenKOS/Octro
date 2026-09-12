import type { WithdrawalFundedFrom, WithdrawalRequest } from "@octro/contracts";
import type { BufferDisbursementPort, LendingV1Port } from "@octro/xrpl";
import { AccessDeniedError, assertAdvanceWithinBalance, assertKycValid } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { BufferLedgerRepository } from "../ports/buffer-ledger-repository.js";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LenderDepositRepository } from "../ports/lender-deposit-repository.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import type { WithdrawalRequestRepository } from "../ports/withdrawal-request-repository.js";
import { assertReady } from "../xrpl-support.js";

export interface WithdrawFromVaultCommand {
  userId: string;
  amountDrops: string;
}

// PER-11 + decision actee : tente d'abord un retrait normal du vault
// partage. Si le vault n'a pas encore assez de liquidite (borrower pas
// encore rembourse — un PortResult non-"ready" est interprete comme de
// l'illiquidite, jamais comme un succes), avance depuis le wallet buffer de
// la plateforme, plafonnee au solde du buffer ("dans le possible", jamais
// un echec silencieux sur un remplissage partiel).
//
// Limite documentee : le solde retirable de chaque lender est calcule
// uniquement depuis Postgres (depots confirmes - retraits deja honores) —
// LendingV1Port n'expose aucune lecture de la part reelle d'un lender dans
// le vault partage. Peut deriver du rendement reel accumule on-chain ;
// limite acceptee pour le hackathon (voir docs/adr).
export class WithdrawFromVaultUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly wallets: WalletRepository,
    private readonly pools: LendingPoolRepository,
    private readonly deposits: LenderDepositRepository,
    private readonly withdrawalRequests: WithdrawalRequestRepository,
    private readonly bufferLedger: BufferLedgerRepository,
    private readonly lending: LendingV1Port,
    private readonly bufferDisbursement: BufferDisbursementPort,
    private readonly walletCrypto: CryptoPort,
    private readonly bufferWalletSeed: string,
    // Solde initial (drops) utilise pour amorcer le grand livre une seule
    // fois, la premiere fois qu'une avance est necessaire (jamais reecrit
    // ensuite) — reflete le solde reel du wallet buffer fourni par l'equipe.
    private readonly bufferInitialBalanceDrops: string,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: WithdrawFromVaultCommand): Promise<WithdrawalRequest> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundError("Wallet", command.userId);

    const pool = await this.pools.get();
    if (!pool) throw new NotFoundError("LendingPool", "shared");

    const entitled = await this.entitledBalance(command.userId);
    const requested = BigInt(command.amountDrops);
    if (requested > entitled) {
      throw new AccessDeniedError(`requested amount exceeds entitled balance (${entitled} drops available)`);
    }

    const withdrawerSeed = await this.walletCrypto.decrypt(wallet.seedCiphertext);
    const vaultResult = await this.lending.withdrawFromVault({
      withdrawerSeed,
      vaultId: pool.vaultId,
      amountDrops: command.amountDrops,
    });

    const now = this.clock.now();
    if (vaultResult.outcome === "ready") {
      const record: WithdrawalRequest = {
        id: this.ids.newId(),
        lender_user_id: command.userId,
        vault_id: pool.vaultId,
        requested_amount_drops: command.amountDrops,
        fulfilled_amount_drops: command.amountDrops,
        funded_from: "vault",
        status: "fulfilled",
        evidence: vaultResult.evidence as unknown as Record<string, unknown>,
        created_at: now.toISOString(),
      };
      await this.withdrawalRequests.save(record);
      return record;
    }

    // Vault illiquide (interprete ainsi, jamais traite comme un succes) :
    // avance depuis le buffer, plafonnee a son solde courant. Amorce le
    // grand livre une seule fois si c'est la toute premiere avance.
    let currentBalance = await this.bufferLedger.getCurrentBalanceDrops();
    if (currentBalance === null) {
      currentBalance = BigInt(this.bufferInitialBalanceDrops);
      await this.bufferLedger.save({
        id: this.ids.newId(),
        withdrawalRequestId: null,
        entryType: "manual_topup",
        amountDrops: this.bufferInitialBalanceDrops,
        balanceAfterDrops: this.bufferInitialBalanceDrops,
        txEvidence: null,
        createdAt: now,
      });
    }
    const advance = requested < currentBalance ? requested : currentBalance;
    assertAdvanceWithinBalance(advance, currentBalance);

    if (advance <= 0n) {
      const record: WithdrawalRequest = {
        id: this.ids.newId(),
        lender_user_id: command.userId,
        vault_id: pool.vaultId,
        requested_amount_drops: command.amountDrops,
        fulfilled_amount_drops: "0",
        funded_from: "buffer",
        status: "failed",
        evidence: null,
        created_at: now.toISOString(),
      };
      await this.withdrawalRequests.save(record);
      return record;
    }

    const disbursement = assertReady(
      await this.bufferDisbursement.sendPayment({
        sourceSeed: this.bufferWalletSeed,
        destinationAddress: wallet.address,
        amountDrops: advance.toString(),
      }),
    );

    const withdrawalId = this.ids.newId();
    await this.bufferLedger.save({
      id: this.ids.newId(),
      withdrawalRequestId: withdrawalId,
      entryType: "advance",
      amountDrops: (-advance).toString(),
      balanceAfterDrops: (currentBalance - advance).toString(),
      txEvidence: disbursement.evidence as unknown as Record<string, unknown>,
      createdAt: now,
    });

    const fundedFrom: WithdrawalFundedFrom = advance === requested ? "buffer" : "partial";
    const record: WithdrawalRequest = {
      id: withdrawalId,
      lender_user_id: command.userId,
      vault_id: pool.vaultId,
      requested_amount_drops: command.amountDrops,
      fulfilled_amount_drops: advance.toString(),
      funded_from: fundedFrom,
      status: fundedFrom === "buffer" ? "fulfilled" : "partial",
      evidence: disbursement.evidence as unknown as Record<string, unknown>,
      created_at: now.toISOString(),
    };
    await this.withdrawalRequests.save(record);
    return record;
  }

  private async entitledBalance(userId: string): Promise<bigint> {
    const deposits = await this.deposits.findByUserId(userId);
    const totalDeposited = deposits
      .filter((d) => d.status === "confirmed")
      .reduce((sum, d) => sum + BigInt(d.amount_drops), 0n);
    const priorWithdrawals = await this.withdrawalRequests.findByLenderUserId(userId);
    const totalWithdrawn = priorWithdrawals.reduce((sum, w) => sum + BigInt(w.fulfilled_amount_drops), 0n);
    return totalDeposited - totalWithdrawn;
  }
}
