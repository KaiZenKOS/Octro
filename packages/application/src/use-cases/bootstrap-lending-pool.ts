import type { LendingV1Port } from "@octro/xrpl";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import { parseLendingAssetId } from "../lending-asset.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import { assertReady } from "../xrpl-support.js";

export interface BootstrapLendingPoolCommand {
  // Convention @octro/contracts (AssetIdSchema) : "xrpl:XRP" pour le natif,
  // "xrpl:RLUSD:<issuer>" pour l'IOU simule (integration xrpl-lending-sim).
  assetId: string;
  ownerAddress: string;
  // Wallet deja fonde manuellement via le faucet du Hackathon Devnet (hors
  // trafic public) — voir infra/scripts/bootstrap-lending-pool.mjs.
  ownerSeed: string;
  debtMaximumDrops: string;
  managementFeeRate: number;
  // XLS-66 : Cover (capital de premiere perte) optionnel, deposite par le
  // meme wallet proprietaire juste apres la creation du broker — verifie en
  // reel dans xrpl-lending-sim. Omis => pas de Cover (garde compatible avec
  // les pools deja amorces sans Cover, ex. le pool XRP existant).
  coverRateMinimum?: number;
  coverRateLiquidation?: number;
  coverAmount?: string;
}

export interface BootstrapLendingPoolResult {
  vaultId: string;
  loanBrokerId: string;
  ownerAddress: string;
  alreadyBootstrapped: boolean;
}

// Operation d'administration, hors trafic public (aucune route HTTP) : cree
// UNE FOIS, PAR ACTIF, le vault ouvert + loan broker partages par tous les
// lenders/borrowers (decision actee, "vault ouvert" deja verrouille dans le
// CDC/hackathon.config.json). Idempotent : si un pool existe deja pour cet
// actif, le reutilise sans en recreer un second.
export class BootstrapLendingPoolUseCase {
  constructor(
    private readonly pools: LendingPoolRepository,
    private readonly lending: LendingV1Port,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: BootstrapLendingPoolCommand): Promise<BootstrapLendingPoolResult> {
    const existing = await this.pools.getByAssetId(command.assetId);
    if (existing) {
      return {
        vaultId: existing.vaultId,
        loanBrokerId: existing.loanBrokerId,
        ownerAddress: existing.ownerAddress,
        alreadyBootstrapped: true,
      };
    }

    const asset = parseLendingAssetId(command.assetId);

    const { vaultId } = assertReady(
      await this.lending.createVault({ ownerSeed: command.ownerSeed, asset: asset.ledgerAsset }),
    ).data;
    const { loanBrokerId } = assertReady(
      await this.lending.setLoanBroker({
        ownerSeed: command.ownerSeed,
        vaultId,
        debtMaximumDrops: command.debtMaximumDrops,
        managementFeeRate: command.managementFeeRate,
        ...(command.coverRateMinimum !== undefined ? { coverRateMinimum: command.coverRateMinimum } : {}),
        ...(command.coverRateLiquidation !== undefined ? { coverRateLiquidation: command.coverRateLiquidation } : {}),
      }),
    ).data;

    if (command.coverAmount !== undefined) {
      assertReady(
        await this.lending.depositCover({
          ownerSeed: command.ownerSeed,
          loanBrokerId,
          amount: asset.toLedgerAmount(command.coverAmount),
        }),
      );
    }

    await this.pools.save({
      id: this.ids.newId(),
      assetId: command.assetId,
      vaultId,
      loanBrokerId,
      ownerAddress: command.ownerAddress,
      ownerSeedCiphertext: await this.crypto.encrypt(command.ownerSeed),
      createdAt: this.clock.now(),
    });

    return { vaultId, loanBrokerId, ownerAddress: command.ownerAddress, alreadyBootstrapped: false };
  }
}
