import type { WithdrawalFundedFrom, WithdrawalRequest } from "@octro/contracts";
import type { BufferDisbursementPort, LendingV1Port } from "@octro/xrpl";
import { AccessDeniedError, assertAdvanceWithinBalance, assertKycValid } from "@octro/domain";
import { addDecimal, compareDecimal, isPositiveDecimal, minDecimal, subtractDecimal } from "../decimal-support.js";
import { NotFoundError } from "../errors.js";
import { parseLendingAssetId } from "../lending-asset.js";
import type { BufferLedgerRepository } from "../ports/buffer-ledger-repository.js";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LenderDepositRepository } from "../ports/lender-deposit-repository.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import type { WithdrawalRequestRepository } from "../ports/withdrawal-request-repository.js";
import { assertReady } from "../xrpl-support.js";

const DEFAULT_ASSET_ID = "xrpl:XRP";

export interface WithdrawFromVaultCommand {
  userId: string;
  amountDrops: string;
  // "xrpl:XRP" par defaut ; "xrpl:RLUSD:<issuer>" pour l'IOU simule.
  assetId?: string;
}

// PER-11 + decision actee : tente d'abord un retrait normal du vault
// partage. Si le vault n'a pas encore assez de liquidite (borrower pas
// encore rembourse — un PortResult non-"ready" est interprete comme de
// l'illiquidite, jamais comme un succes), avance depuis le wallet buffer de
// la plateforme, plafonnee au solde du buffer ("dans le possible", jamais
// un echec silencieux sur un remplissage partiel). Le buffer avance
// toujours en XRP natif (wallet unique fourni par l'equipe) quel que soit
// l'actif du vault — limite documentee : une avance pour un vault IOU n'est
// pas possible tant qu'un buffer IOU dedie n'existe pas ; dans ce cas
// l'avance est purement plafonnee a 0 par manque de solde compatible.
//
// Arithmetique en chaine decimale (decimal-support.ts), jamais un flottant
// ni un BigInt brut sur des drops — necessaire pour couvrir a la fois un
// Vault XRP (entiers) et un Vault IOU (decimales), integration
// xrpl-lending-sim.
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
    private readonly txEvidence: TxEvidenceRepository,
    private readonly bufferWalletSeed: string,
    // Solde initial (drops) utilise pour amorcer le grand livre une seule
    // fois, la premiere fois qu'une avance est necessaire (jamais reecrit
    // ensuite) — reflete le solde reel du wallet buffer fourni par l'equipe.
    // Toujours exprime en XRP (drops), le buffer n'existant qu'en XRP natif.
    private readonly bufferInitialBalanceDrops: string,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: WithdrawFromVaultCommand): Promise<WithdrawalRequest> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundError("Wallet", command.userId);

    const assetId = command.assetId ?? DEFAULT_ASSET_ID;
    const asset = parseLendingAssetId(assetId);
    const pool = await this.pools.getByAssetId(assetId);
    if (!pool) throw new NotFoundError("LendingPool", assetId);

    const entitled = await this.entitledBalance(command.userId, assetId);
    if (compareDecimal(command.amountDrops, entitled) > 0) {
      throw new AccessDeniedError(`requested amount exceeds entitled balance (${entitled} available)`);
    }

    const withdrawerSeed = await this.walletCrypto.decrypt(wallet.seedCiphertext);
    const vaultResult = await this.lending.withdrawFromVault({
      withdrawerSeed,
      vaultId: pool.vaultId,
      amountDrops: asset.toLedgerAmount(command.amountDrops),
    });

    const now = this.clock.now();
    if (vaultResult.outcome === "ready") {
      await this.txEvidence.record({
        userId: command.userId,
        assetId,
        operation: "withdraw_from_vault",
        evidence: vaultResult.evidence as unknown as Record<string, unknown>,
        recordedAt: now,
      });
      const record: WithdrawalRequest = {
        id: this.ids.newId(),
        lender_user_id: command.userId,
        vault_id: pool.vaultId,
        asset_id: assetId,
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

    // Vault illiquide (interprete ainsi, jamais traite comme un succes) : le
    // buffer n'existe qu'en XRP natif ; une avance n'est tentee que pour un
    // retrait en XRP (asset_id === "xrpl:XRP"), sinon plafonnee a 0.
    const bufferAssetId = "xrpl:XRP";
    let currentBalance = await this.bufferLedger.getCurrentBalance(bufferAssetId);
    if (currentBalance === null) {
      currentBalance = this.bufferInitialBalanceDrops;
      await this.bufferLedger.save({
        id: this.ids.newId(),
        assetId: bufferAssetId,
        withdrawalRequestId: null,
        entryType: "manual_topup",
        amount: this.bufferInitialBalanceDrops,
        balanceAfter: this.bufferInitialBalanceDrops,
        txEvidence: null,
        createdAt: now,
      });
    }
    const advance = assetId === bufferAssetId ? minDecimal(command.amountDrops, currentBalance) : "0";
    assertAdvanceWithinBalance(advance, currentBalance);

    if (!isPositiveDecimal(advance)) {
      const record: WithdrawalRequest = {
        id: this.ids.newId(),
        lender_user_id: command.userId,
        vault_id: pool.vaultId,
        asset_id: assetId,
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
        amountDrops: advance,
      }),
    );
    await this.txEvidence.record({
      userId: command.userId,
      assetId,
      operation: "withdraw_from_vault_buffer_advance",
      evidence: disbursement.evidence as unknown as Record<string, unknown>,
      recordedAt: now,
    });

    const withdrawalId = this.ids.newId();
    await this.bufferLedger.save({
      id: this.ids.newId(),
      assetId: bufferAssetId,
      withdrawalRequestId: withdrawalId,
      entryType: "advance",
      amount: `-${advance}`,
      balanceAfter: subtractDecimal(currentBalance, advance),
      txEvidence: disbursement.evidence as unknown as Record<string, unknown>,
      createdAt: now,
    });

    const fundedFrom: WithdrawalFundedFrom = compareDecimal(advance, command.amountDrops) === 0 ? "buffer" : "partial";
    const record: WithdrawalRequest = {
      id: withdrawalId,
      lender_user_id: command.userId,
      vault_id: pool.vaultId,
      asset_id: assetId,
      requested_amount_drops: command.amountDrops,
      fulfilled_amount_drops: advance,
      funded_from: fundedFrom,
      status: fundedFrom === "buffer" ? "fulfilled" : "partial",
      evidence: disbursement.evidence as unknown as Record<string, unknown>,
      created_at: now.toISOString(),
    };
    await this.withdrawalRequests.save(record);
    return record;
  }

  private async entitledBalance(userId: string, assetId: string): Promise<string> {
    const deposits = await this.deposits.findByUserId(userId);
    const totalDeposited = deposits
      .filter((d) => d.status === "confirmed" && d.asset_id === assetId)
      .reduce((sum, d) => addDecimal(sum, d.amount_drops), "0");
    const priorWithdrawals = await this.withdrawalRequests.findByLenderUserId(userId);
    const totalWithdrawn = priorWithdrawals
      .filter((w) => w.asset_id === assetId)
      .reduce((sum, w) => addDecimal(sum, w.fulfilled_amount_drops), "0");
    return subtractDecimal(totalDeposited, totalWithdrawn);
  }
}
