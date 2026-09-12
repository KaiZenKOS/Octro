import type { LendingV1Port } from "@octro/xrpl";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import { assertReady } from "../xrpl-support.js";

export interface BootstrapLendingPoolCommand {
  ownerAddress: string;
  // Wallet deja fonde manuellement via le faucet du Hackathon Devnet (hors
  // trafic public) — voir infra/scripts/bootstrap-lending-pool.mjs.
  ownerSeed: string;
  debtMaximumDrops: string;
  managementFeeRate: number;
}

export interface BootstrapLendingPoolResult {
  vaultId: string;
  loanBrokerId: string;
  ownerAddress: string;
  alreadyBootstrapped: boolean;
}

// Operation d'administration, hors trafic public (aucune route HTTP) : cree
// UNE FOIS le vault ouvert + loan broker partages par tous les
// lenders/borrowers (decision actee, "vault ouvert" deja verrouille dans le
// CDC/hackathon.config.json). Idempotent : si un pool existe deja, le
// reutilise sans en recreer un second.
export class BootstrapLendingPoolUseCase {
  constructor(
    private readonly pools: LendingPoolRepository,
    private readonly lending: LendingV1Port,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: BootstrapLendingPoolCommand): Promise<BootstrapLendingPoolResult> {
    const existing = await this.pools.get();
    if (existing) {
      return {
        vaultId: existing.vaultId,
        loanBrokerId: existing.loanBrokerId,
        ownerAddress: existing.ownerAddress,
        alreadyBootstrapped: true,
      };
    }

    const { vaultId } = assertReady(
      await this.lending.createVault({ ownerSeed: command.ownerSeed, asset: { currency: "XRP" } }),
    ).data;
    const { loanBrokerId } = assertReady(
      await this.lending.setLoanBroker({
        ownerSeed: command.ownerSeed,
        vaultId,
        debtMaximumDrops: command.debtMaximumDrops,
        managementFeeRate: command.managementFeeRate,
      }),
    ).data;

    await this.pools.save({
      id: this.ids.newId(),
      vaultId,
      loanBrokerId,
      ownerAddress: command.ownerAddress,
      ownerSeedCiphertext: await this.crypto.encrypt(command.ownerSeed),
      createdAt: this.clock.now(),
    });

    return { vaultId, loanBrokerId, ownerAddress: command.ownerAddress, alreadyBootstrapped: false };
  }
}
