import type { User } from "@octro/contracts";
import { NotFoundError, VerificationCodeInvalidError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { EmailVerificationRepository } from "../ports/email-verification-repository.js";
import { toUserDTO, type UserRepository } from "../ports/user-repository.js";
import { hashToken } from "../security/token-hash.js";

const MAX_ATTEMPTS = 5;

export interface ConfirmEmailCommand {
  userId: string;
  code: string;
}

export class ConfirmEmailUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailVerifications: EmailVerificationRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<User> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new NotFoundError("User", command.userId);
    }

    const verification = await this.emailVerifications.findLatestActiveForUser(command.userId, "signup");
    const now = this.clock.now();

    if (
      !verification ||
      verification.expiresAt.getTime() < now.getTime() ||
      verification.attempts >= MAX_ATTEMPTS ||
      verification.codeHash !== hashToken(command.code)
    ) {
      if (verification && verification.attempts < MAX_ATTEMPTS) {
        await this.emailVerifications.save({ ...verification, attempts: verification.attempts + 1 });
      }
      throw new VerificationCodeInvalidError();
    }

    await this.emailVerifications.save({ ...verification, consumedAt: now });
    const verifiedUser = { ...user, emailVerifiedAt: now };
    await this.users.save(verifiedUser);
    return toUserDTO(verifiedUser);
  }
}
