import { randomBytes } from "node:crypto";
import { EmailNotVerifiedError, InvalidCredentialsError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { UserRepository } from "../ports/user-repository.js";
import { verifyPassword } from "../security/password-hash.js";
import { hashToken } from "../security/token-hash.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  userId: string;
}

// Schema retenu (simplicite de demo live plutot qu'un magic-link) : email +
// mot de passe + jeton de session opaque en Bearer.
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !(await verifyPassword(command.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }
    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    const now = this.clock.now();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.sessions.save({ tokenHash: hashToken(token), userId: user.id, createdAt: now, expiresAt });

    return { token, expiresAt: expiresAt.toISOString(), userId: user.id };
  }
}
