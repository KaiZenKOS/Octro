import type { Wallet } from "@octro/contracts";
import type { WalletProvisioningPort } from "@octro/xrpl";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import { toWalletDTO, type WalletRepository } from "../ports/wallet-repository.js";

const NETWORK = "custom-hackathon-devnet";

export interface ProvisionWalletCommand {
  userId: string;
}

// Phase E — activation financière explicite après le KYC. Idempotent : un
// utilisateur n'a jamais plus d'un wallet ; un second appel renvoie celui
// déjà provisionné plutôt que d'en générer un autre.
export class ProvisionWalletUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly provisioning: WalletProvisioningPort,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: ProvisionWalletCommand): Promise<Wallet> {
    const existing = await this.wallets.findByUserId(command.userId);
    if (existing) return toWalletDTO(existing);

    const { address, seed } = await this.provisioning.generate();
    const record = {
      id: this.ids.newId(),
      userId: command.userId,
      address,
      seedCiphertext: await this.crypto.encrypt(seed),
      network: NETWORK,
      createdAt: this.clock.now(),
    };
    await this.wallets.save(record);
    return toWalletDTO(record);
  }
}
