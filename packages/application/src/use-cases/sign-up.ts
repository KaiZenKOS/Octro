import type { User } from "@octro/contracts";
import { randomInt } from "node:crypto";
import { EmailAlreadyRegisteredError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { EmailVerificationRepository } from "../ports/email-verification-repository.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { MailPort } from "../ports/mail-port.js";
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
// wallet XRPL non fonde (Phase E, ProvisionWalletUseCase — keypair seul,
// aucun appel faucet). Un utilisateur non verifie n'a de toute facon acces
// a aucun instrument financier (PER-11, cf. packages/domain/src/kyc.ts).
export class SignUpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerifications: EmailVerificationRepository,
    private readonly mail: MailPort,
    private readonly walletProvisioning: ProvisionWalletUseCase,
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
    await this.walletProvisioning.execute({ userId: user.id });

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
}
