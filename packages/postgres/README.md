# PostgreSQL persistence adapter

Implements the current application Workspace/EconomicEvent repositories and adds durable ForecastRun, Plan, Approval, Execution, AuditEvent, OutboxEvent, and IdempotencyKey storage. This is an adapter library, not yet a production database connection or deployment claim.

## Active requirements

- `SEC-01`: every repository is constructed with a trusted Workspace/tenant scope, includes it in reads/writes, and relies on PostgreSQL row-level security as defense in depth. A cross-Workspace request must be refused.
- `SEC-02`: `PostgresIdempotencyExecutor` reserves `(tenant, route, key)` in the same transaction as the business mutation and response. Same key/body replays the stored response; same key/different body throws an error with HTTP status `409`.
- `OPS-01`: audit rows can correlate plan, approval, execution, the immutable `plan_hash`, and the ledger transaction hash observed for that execution. The hash remains null before ledger inclusion; no hash is fabricated.
- `PER-11`: forecast persistence has no Stripe Identity or KYC dependency.
- `DATA-03`: money is accepted only as strict decimal strings and stored as `NUMERIC(38,18)`; JavaScript floats are never converted into amounts.
- CDC v2.2 chapter 22: append an outbox row using `enqueueOutboxInTransaction` with the business write; claims use `FOR UPDATE SKIP LOCKED`, handlers receive a stable idempotency key, and retries are at-least-once with capped exponential backoff and a dead-letter state.

## Integration boundary

The host can inject the narrow `SqlPool` interface or create the official `pg` driver through `createPgPool`; credentials and TLS options remain server-only. Apply `infra/migrations/0001_core_persistence.sql` using a migration role before app traffic. Set `octro.workspace_id` transaction-locally through `inWorkspaceTransaction`; do not grant the API an unscoped connection or derive this value from an untrusted request body. Create repository instances per trusted request scope. Workspace bootstrap needs a separately authorized creation path.

Do not reuse the API database identity for the worker. The worker operates with a trusted Workspace scope and calls the same idempotent business handlers; it is not an exactly-once system. Deterministic tests use injected SQL fakes. To run the environment-gated real PostgreSQL test, provide a disposable database in `OCTRO_TEST_DATABASE_URL`, then run `npm run test:integration --workspace @octro/postgres`. The test creates and drops only a randomly named temporary schema. It validates migration application, cross-Workspace read isolation, duplicate command replay/conflict, and scoped outbox claiming. No real database integration, concurrent contention, backup/restore, or operational restore run was executed in this task; those remain necessary before claiming production readiness (`OPS-03`).
