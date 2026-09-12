import { Wallet } from "xrpl";
import type { WalletProvisioningPort } from "./ports.js";

// Genere uniquement un keypair (Wallet.generate(), aucun Client, aucun
// appel faucet) : le compte reste non fonde/non active sur le ledger tant
// qu'aucun paiement ne l'atteint. Distinct du flux d'administration (wallet
// buffer, wallet proprietaire du vault/broker) qui, lui, est fonde une fois
// manuellement via le faucet du Hackathon Devnet.
export class XrplWalletProvisioningAdapter implements WalletProvisioningPort {
  async generate(): Promise<{ address: string; seed: string }> {
    const wallet = Wallet.generate();
    if (!wallet.seed) {
      throw new Error("Wallet.generate() did not return a seed");
    }
    return { address: wallet.classicAddress, seed: wallet.seed };
  }
}
