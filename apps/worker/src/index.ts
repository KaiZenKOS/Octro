import type { ClaimedOutboxMessage, PostgresOutboxRepository } from "@octro/postgres";

export type OutboxHandler = (
  message: ClaimedOutboxMessage,
  idempotencyKey: string,
) => Promise<void>;

export interface WorkerOptions {
  batchSize?: number;
  leaseSeconds?: number;
  maxAttempts?: number;
  baseDelaySeconds?: number;
  maxDelaySeconds?: number;
  random?: () => number;
  newLockToken: () => string;
}

export interface WorkerSummary {
  claimed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  leaseLost: number;
}

function backoffSeconds(attempt: number, base: number, max: number, random: () => number): number {
  const jitter = random();
  if (!Number.isFinite(jitter) || jitter < 0 || jitter >= 1) throw new RangeError("worker random() must return [0, 1)");
  return Math.min(max, base * 2 ** Math.max(0, attempt - 1)) * (0.8 + jitter * 0.4);
}

/**
 * Process one bounded batch. At-least-once delivery is intentional (CDC ch.22):
 * handlers receive a stable idempotency key and must deduplicate external effects.
 * Replaying a job can happen if the worker crashes after the handler succeeds
 * but before markDelivered commits.
 */
export async function runOutboxBatch(
  repository: PostgresOutboxRepository,
  handlers: ReadonlyMap<string, OutboxHandler>,
  options: WorkerOptions,
): Promise<WorkerSummary> {
  const batchSize = options.batchSize ?? 10;
  const leaseSeconds = options.leaseSeconds ?? 30;
  const maxAttempts = options.maxAttempts ?? 8;
  const baseDelay = options.baseDelaySeconds ?? 1;
  const maxDelay = options.maxDelaySeconds ?? 300;
  const random = options.random ?? Math.random;
  const messages = await repository.claimBatch(batchSize, leaseSeconds, options.newLockToken());
  const summary: WorkerSummary = { claimed: messages.length, delivered: 0, retried: 0, deadLettered: 0, leaseLost: 0 };

  for (const message of messages) {
    try {
      const handler = handlers.get(message.event_type);
      if (!handler) throw Object.assign(new Error("No handler registered for outbox event"), { code: "HANDLER_NOT_FOUND" });
      await handler(message, `octro-outbox:${message.tenant_id}:${message.id}`);
      if (await repository.markDelivered(message.id, message.lock_token)) summary.delivered += 1;
      else summary.leaseLost += 1;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "HANDLER_FAILED";
      const delay = backoffSeconds(message.attempts, baseDelay, maxDelay, random);
      const recorded = await repository.markFailed(message.id, message.lock_token, delay, maxAttempts, code);
      if (!recorded) summary.leaseLost += 1;
      else if (message.attempts >= maxAttempts) summary.deadLettered += 1;
      else summary.retried += 1;
    }
  }
  return summary;
}
