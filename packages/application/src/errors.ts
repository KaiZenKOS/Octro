export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

// Extension Lending/KYC/Credit (Phase A — comptes). Ces refus d'authentification
// restent hors de l'enum ErrorCodeSchema (packages/contracts/src/errors.ts),
// comme le placeholder x-dev-tenant-id existant (SEC-01) : ce sont des
// echecs de transport/authentification, pas des codes metier du chapitre 19.
export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`an account already exists for ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("email address not verified yet");
    this.name = "EmailNotVerifiedError";
  }
}

export class VerificationCodeInvalidError extends Error {
  constructor(message = "verification code invalid or expired") {
    super(message);
    this.name = "VerificationCodeInvalidError";
  }
}

export class InvalidSessionError extends Error {
  constructor(message = "session invalid or expired") {
    super(message);
    this.name = "InvalidSessionError";
  }
}

// Extension Lending/KYC/Credit — Phase E. Un PortResult XRPL non-"ready"
// (rejected/unavailable/unsupported/degraded, packages/xrpl/src/types.ts)
// ne devient jamais un succes optimiste : l'use-case leve cette erreur, la
// route l'associe au code HTTP/erreur qui convient (jamais convertie en
// exception generique, voir apps/api/src/http-errors.ts).
export class LendingOperationFailedError extends Error {
  constructor(
    public readonly outcome: "rejected" | "unavailable" | "unsupported" | "degraded",
    public readonly detail: Record<string, unknown> | string,
  ) {
    super(`lending operation did not succeed: ${outcome}`);
    this.name = "LendingOperationFailedError";
  }
}
