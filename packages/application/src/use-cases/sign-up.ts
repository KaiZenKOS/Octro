import type { User } from "@octro/contracts";
import type { BufferDisbursementPort } from "@octro/xrpl";
import { randomInt } from "node:crypto";
import { EmailAlreadyRegisteredError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { EmailVerificationRepository } from "../ports/email-verification-repository.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { MailPort } from "../ports/mail-port.js";
import type { TxEvidenceRepository } from "../ports/tx-evidence-repository.js";
import { toUserDTO, type UserRepository } from "../ports/user-repository.js";
import { hashPassword } from "../security/password-hash.js";
import { hashToken } from "../security/token-hash.js";
import type { ProvisionWalletUseCase } from "./provision-wallet.js";

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface SignUpCommand {
  email: string;
  password: string;
}

// Inscription + envoi du code de verification email + provisionnement d'un
// wallet XRPL + activation on-chain (Phase E, ProvisionWalletUseCase genere
// un keypair seul, aucun appel faucet — decision actee ; le present
// use-case l'active reellement). Un utilisateur non verifie n'a de toute
// facon acces a aucun instrument financier (PER-11, cf.
// packages/domain/src/kyc.ts) — l'activation n'en est pas un, c'est un
// prerequis technique du ledger, jamais un solde utilisable par
// l'utilisateur pour deposer/emprunter.
export class SignUpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerifications: EmailVerificationRepository,
    private readonly mail: MailPort,
    private readonly walletProvisioning: ProvisionWalletUseCase,
    private readonly bufferDisbursement: BufferDisbursementPort,
    private readonly bufferWalletSeed: string,
    // Reserve de base (10 XRP sur ce devnet, cf. server_state) + reserve
    // incrementale d'un premier objet possede (2 XRP — verifie en reel :
    // sans elle, CredentialAccept echoue tecINSUFFICIENT_RESERVE des que le
    // credential accepte devient un objet possede par ce compte) + une
    // petite marge pour les frais de transaction eux-memes.
    private readonly walletActivationAmountDrops: string,
    private readonly txEvidence: TxEvidenceRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: SignUpCommand): Promise<User> {
    const email = command.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyRegisteredError(email);
    }

    const now = this.clock.now();
    const passwordHash = await hashPassword(command.password);
    const user = {
      id: this.ids.newId(),
      email,
      passwordHash,
      emailVerifiedAt: null,
      createdAt: now,
    };
    await this.users.save(user);
    const wallet = await this.walletProvisioning.execute({ userId: user.id });
    await this.activateWalletBestEffort(user.id, wallet.address);

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.emailVerifications.save({
      id: this.ids.newId(),
      userId: user.id,
      purpose: "signup",
      codeHash: hashToken(code),
      expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
      consumedAt: null,
      attempts: 0,
    });

    await this.mail.sendEmail({
      to: user.email,
      subject: "Votre code de verification Octro",
      text: `Votre code de verification Octro est ${code}. Il expire dans 10 minutes.`,
    });

    return toUserDTO(user);
  }

  // Best-effort, jamais bloquant pour l'inscription (meme raisonnement que
  // SimulateKycUseCase.issueAndAcceptCredentialBestEffort) : un incident
  // reseau ponctuel sur le ledger ne doit pas empecher la creation du
  // compte. Sans cette activation, le wallet n'existe pas sur le ledger
  // (actNotFound) et ne peut donc jamais signer quoi que ce soit —
  // ni CredentialAccept plus tard, ni un premier depot.
  private async activateWalletBestEffort(userId: string, walletAddress: string): Promise<void> {
    if (!this.bufferWalletSeed) return;
    try {
      const outcome = await this.bufferDisbursement.sendPayment({
        sourceSeed: this.bufferWalletSeed,
        destinationAddress: walletAddress,
        amountDrops: this.walletActivationAmountDrops,
      });
      if (outcome.outcome !== "ready") return;
      await this.txEvidence.record({
        userId,
        assetId: "xrpl:XRP",
        operation: "wallet_activation",
        evidence: outcome.evidence as unknown as Record<string, unknown>,
        recordedAt: this.clock.now(),
      });
    } catch {
      // Best-effort : voir le commentaire ci-dessus.
    }
  }
}
