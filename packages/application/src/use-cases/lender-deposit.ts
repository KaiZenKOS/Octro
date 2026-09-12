import type { LenderDeposit } from "@octro/contracts";
import type { LendingV1Port } from "@octro/xrpl";
import { assertKycValid } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import { parseLendingAssetId } from "../lending-asset.js";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { LenderDepositRepository } from "../ports/lender-deposit-repository.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";
import { assertReady } from "../xrpl-support.js";

export interface LenderDepositCommand {
  userId: string;
  amountDrops: string;
  // "xrpl:XRP" par defaut ; "xrpl:RLUSD:<issuer>" pour l'IOU simule
  // (integration xrpl-lending-sim).
  assetId?: string;
}

const DEFAULT_ASSET_ID = "xrpl:XRP";

// PER-11 : KYC valide requis avant tout instrument financier. Depose dans
// le vault ouvert partage (decision actee), un par actif, via la propre
// seed (dechiffree transitoirement) du lender.
export class LenderDepositUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly wallets: WalletRepository,
    private readonly pools: LendingPoolRepository,
    private readonly deposits: LenderDepositRepository,
    private readonly lending: LendingV1Port,
    private readonly crypto: CryptoPort,
    private readonly txEvidence: TxEvidenceRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: LenderDepositCommand): Promise<LenderDeposit> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundError("Wallet", command.userId);

    const assetId = command.assetId ?? DEFAULT_ASSET_ID;
    const asset = parseLendingAssetId(assetId);
    const pool = await this.pools.getByAssetId(assetId);
    if (!pool) throw new NotFoundError("LendingPool", assetId);

    const depositorSeed = await this.crypto.decrypt(wallet.seedCiphertext);
    const { evidence } = assertReady(
      await this.lending.depositToVault({
        depositorSeed,
        vaultId: pool.vaultId,
        amountDrops: asset.toLedgerAmount(command.amountDrops),
      }),
    );
    await this.txEvidence.record({
      userId: command.userId,
      assetId,
      operation: "lender_deposit",
      evidence: evidence as unknown as Record<string, unknown>,
      recordedAt: this.clock.now(),
    });

    const deposit: LenderDeposit = {
      id: this.ids.newId(),
      user_id: command.userId,
      vault_id: pool.vaultId,
      asset_id: assetId,
      amount_drops: command.amountDrops,
      status: "confirmed",
      tx_evidence: evidence as unknown as Record<string, unknown>,
      created_at: this.clock.now().toISOString(),
    };
    await this.deposits.save(deposit);
    return deposit;
  }
}
