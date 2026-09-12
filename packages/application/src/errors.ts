export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class OptimizerTimeoutError extends Error {
  constructor(message = "the deterministic optimizer exceeded its time limit") {
    super(message);
    this.name = "OptimizerTimeoutError";
  }
}

export class OptimizerUnavailableError extends Error {
  constructor(message = "the deterministic optimizer is unavailable") {
    super(message);
    this.name = "OptimizerUnavailableError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor(message = "the idempotency key was already used for a different event") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}
