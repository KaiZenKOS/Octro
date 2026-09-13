import type { CredentialsAndDomainsPort } from "@octro/xrpl";
import { NotFoundError } from "../errors.js";
import type { WalletRepository } from "../ports/wallet-repository.js";

export interface GetKycCredentialStatusQuery {
  userId: string;
}

export interface KycCredentialStatus {
  allowed: boolean;
  reasonCode: string;
}

// Verifie sur le ledger (pas seulement en base applicative) qu'une
// attestation de credential ACCEPTEE existe pour ce wallet — complementaire
// au KYC simule (Postgres), jamais un remplacement. Best-effort par
// construction (SimulateKycUseCase) : peut renvoyer allowed=false meme si
// le KYC applicatif est "valid", si le wallet n'etait pas encore finance
// au moment de la simulation.
export class GetKycCredentialStatusUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly credentialsAndDomains: CredentialsAndDomainsPort,
  ) {}

  async execute(query: GetKycCredentialStatusQuery): Promise<KycCredentialStatus> {
    const wallet = await this.wallets.findByUserId(query.userId);
    if (!wallet) throw new NotFoundError("Wallet", query.userId);

    const result = await this.credentialsAndDomains.evaluateDepositEligibility({
      depositorAddress: wallet.address,
      vaultId: "",
    });
    return { allowed: result.allowed, reasonCode: result.reasonCode };
  }
}
