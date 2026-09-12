import { describe, expect, it } from "vitest";
import { runOutboxBatch } from "../src/index.js";
import type { ClaimedOutboxMessage, PostgresOutboxRepository } from "@octro/postgres";

const message: ClaimedOutboxMessage = {
  id: "44444444-4444-4444-8444-444444444444",
  tenant_id: "11111111-1111-4111-8111-111111111111",
  event_type: "notification.ready",
  payload: { kind: "forecast" },
  attempts: 2,
  created_at: "2026-09-12T10:00:00.000Z",
  lock_token: "55555555-5555-4555-8555-555555555555",
};

describe("worker outbox recovery (CDC ch.22)", () => {
  it("passes a stable dedupe key and marks a handled message delivered", async () => {
    const calls: string[] = [];
    const repository = {
      claimBatch: async () => [message],
      markDelivered: async () => true,
      markFailed: async () => false,
    } as unknown as PostgresOutboxRepository;
    const summary = await runOutboxBatch(repository, new Map([["notification.ready", async (_event, key) => { calls.push(key); }]]), {
      newLockToken: () => "batch-lock",
    });
    expect(calls).toEqual([`octro-outbox:${message.tenant_id}:${message.id}`]);
    expect(summary).toEqual({ claimed: 1, delivered: 1, retried: 0, deadLettered: 0, leaseLost: 0 });
  });

  it("schedules retry with capped exponential backoff and counts exhaustion as dead-letter", async () => {
    let recorded: unknown[] = [];
    const repository = {
      claimBatch: async () => [message],
      markDelivered: async () => false,
      markFailed: async (...args: unknown[]) => { recorded = args; return true; },
    } as unknown as PostgresOutboxRepository;
    const summary = await runOutboxBatch(repository, new Map([["notification.ready", async () => { throw Object.assign(new Error("unavailable"), { code: "SMTP_DOWN" }); }]]), {
      maxAttempts: 2,
      baseDelaySeconds: 3,
      maxDelaySeconds: 10,
      random: () => 0.5,
      newLockToken: () => "batch-lock",
    });
    expect(recorded[0]).toBe(message.id);
    expect(recorded[3]).toBe(2);
    expect(recorded[4]).toBe("SMTP_DOWN");
    expect(summary.deadLettered).toBe(1);
  });
});
