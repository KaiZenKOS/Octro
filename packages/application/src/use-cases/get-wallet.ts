import type { Wallet } from "@octro/contracts";
import { NotFoundError } from "../errors.js";
import { toWalletDTO } from "../ports/wallet-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";

export interface GetWalletQuery {
  userId: string;
}

// Expose l'adresse publique du wallet XRPL provisionne a l'inscription
// (jamais la seed) — n'existait jusqu'ici sur aucune route, empechant le
// client d'afficher a l'utilisateur l'adresse qu'il possede reellement.
export class GetWalletUseCase {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(query: GetWalletQuery): Promise<Wallet> {
    const wallet = await this.wallets.findByUserId(query.userId);
    if (!wallet) {
      throw new NotFoundError("Wallet", query.userId);
    }
    return toWalletDTO(wallet);
  }
}
