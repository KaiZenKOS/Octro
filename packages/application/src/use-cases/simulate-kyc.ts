import type { KycStatus } from "@octro/contracts";
import type { CredentialsAndDomainsPort } from "@octro/xrpl";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";

export interface SimulateKycCommand {
  userId: string;
  result: "valid" | "invalid";
}

// Type de credential emis par la plateforme (CredentialCreate/Accept,
// integration Credentials + Permissioned Domains) quand un KYC simule
// passe a "valid" — une preuve d'identite on-chain complementaire au KYC
// applicatif (Postgres), jamais un remplacement (le KYC reste simule,
// CMP-01 ; ce credential atteste seulement "cet utilisateur a une
// attestation OCTRO_KYC_VALID acceptee", jamais une vraie verification
// d'identite).
export const KYC_CREDENTIAL_TYPE = "OCTRO_KYC_VALID";

// Phase B — KYC simule (decision actee) : popup valide/invalide cote client,
// aucun appel a un vrai fournisseur d'identite (CMP-01, "aucun KYC reel dans
// fixture"). `simulated: true` est un litteral, jamais autre chose.
//
// Extension Credentials + Permissioned Domains (LOAD-01) : quand le
// resultat est "valid", emet ET fait accepter un Credential on-chain
// (CredentialCreate par la plateforme -> CredentialAccept par le wallet de
// l'utilisateur) — best-effort, jamais bloquant. Un wallet pas encore
// finance (aucun XRP, cas d'un utilisateur fraichement inscrit — meme
// limite deja documentee pour deposit/borrow/withdraw) ne peut pas signer
// CredentialAccept : la simulation KYC reste valide dans Postgres quand
// meme, seule la preuve on-chain manque. Le statut renvoye au client ne
// change jamais selon que cette etape reussisse ou non.
export class SimulateKycUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly wallets: WalletRepository,
    private readonly credentialsAndDomains: CredentialsAndDomainsPort,
    private readonly walletCrypto: CryptoPort,
    private readonly txEvidence: TxEvidenceRepository,
    private readonly platformIssuerAddress: string,
    private readonly platformIssuerSeed: string,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: SimulateKycCommand): Promise<KycStatus> {
    const status: KycStatus = {
      id: this.ids.newId(),
      user_id: command.userId,
      status: command.result,
      decided_at: this.clock.now().toISOString(),
      simulated: true,
    };
    await this.kycStatuses.save(status);

    if (command.result === "valid") {
      await this.issueAndAcceptCredentialBestEffort(command.userId);
    }

    return status;
  }

  private async issueAndAcceptCredentialBestEffort(userId: string): Promise<void> {
    try {
      const wallet = await this.wallets.findByUserId(userId);
      if (!wallet || !this.platformIssuerSeed) return;

      const issued = await this.credentialsAndDomains.issueCredential({
        issuerSeed: this.platformIssuerSeed,
        subjectAddress: wallet.address,
        credentialType: KYC_CREDENTIAL_TYPE,
      });
      if (issued.outcome !== "ready") return;

      const subjectSeed = await this.walletCrypto.decrypt(wallet.seedCiphertext);
      const accepted = await this.credentialsAndDomains.acceptCredential({
        subjectSeed,
        issuerAddress: this.platformIssuerAddress,
        credentialType: KYC_CREDENTIAL_TYPE,
      });

      await this.txEvidence.record({
        userId,
        assetId: "xrpl:XRP",
        operation: "kyc_credential_issue_and_accept",
        evidence: {
          issue: issued.evidence as unknown as Record<string, unknown>,
          ...(accepted.outcome === "ready" ? { accept: accepted.evidence as unknown as Record<string, unknown> } : {}),
        },
        recordedAt: this.clock.now(),
      });
    } catch {
      // Best-effort : une preuve on-chain manquante ne bloque jamais le
      // statut KYC applicatif deja ecrit ci-dessus.
    }
  }
}
