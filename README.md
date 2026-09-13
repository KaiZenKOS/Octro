# Octro — Track 1 Loaded

Octro is a financial planning and lending platform: a forecasting engine that anyone
can use without a wallet, KYC or credit check, sitting on top of a real XRPL Lending
Protocol V1 integration for the people who actually want to lend or borrow. Built for
the XRPL Lending Protocol Hackathon (DeVinci Blockchain × Ripple).

**Developer feedback from the hackathon:** [docs/FEEDBACK.md](docs/FEEDBACK.md)
**Full proof of execution (every real transaction, with explorer links):** [docs/progress/samet/evidence/PROOF_OF_EXECUTION.md](docs/progress/samet/evidence/PROOF_OF_EXECUTION.md)

## What it does

Octro serves three kinds of users — individuals, freelancers and businesses — and
splits cleanly into two layers:

- **Forecasting, for everyone.** Log income and expenses, see upcoming deadlines, and
  compare what-if scenarios (including debt-free options) without ever touching a
  wallet, a KYC provider or a credit check. This layer works standalone; nothing
  financial is gated behind it.
- **Real lending, once you're onboarded.** Sign up, clear a KYC step, connect your own
  Odoo instance so Octro can assess your credit from your actual accounting data, and
  you can deposit into a shared XRPL vault as a lender or draw against your credit line
  as a borrower. Deposit, loan origination, drawdown, repayment, withdrawal — every one
  of those is a real signed XRPL transaction.

Track 1 means the vault is open-ended: it stays open for deposits and withdrawals for
its whole life, only the loans inside it have a term.

### KYC and credit scoring

These are two different things, worth telling apart:

- **KYC is a sandboxed decision.** There's no real identity-verification provider
  wired up yet (the plan is Didit, currently dormant) — a user just picks
  approve/reject and the app follows the same downstream path a real provider's
  answer would. That said, an approval isn't just a flag in a database: it mints a
  real on-chain `Credential` between the platform and the user's wallet
  (`CredentialCreate` + `CredentialAccept`), which you can check against the ledger.
- **Credit scoring is fully real.** A user connects their own Odoo instance (BYO,
  Odoo's External JSON-2 API), and Octro pulls their actual sales orders, invoices,
  vendor bills and general-ledger lines through that API — no mock data, no canned
  score. `packages/credit` then runs a proper underwriting model on it: revenue scale,
  profitability, growth and volatility, collections, balance-sheet health, customer
  concentration and operating history, each scored and weighted into a composite score,
  mapped to a letter grade, which drives a recommended credit line sized three
  independent ways (cash-flow capacity, a revenue-based cap, and a DSCR-based cap) —
  whichever is tightest wins — plus an approve / approve-with-conditions / decline
  call. Odoo is currently the only ERP connector; the underwriting engine itself
  doesn't assume that, it's written against a plain data shape, not against Odoo's API
  directly.

### Loaded extensions, already working end to end

- **Credentials + Permissioned Domains** — the on-chain `Credential` from KYC (above)
  is one half of this; the other half, a `PermissionedDomain` gating a vault by
  accepted credential type, is built and proven out on its own throwaway vault rather
  than attached to the shared production one (see the proof of execution for why).
- **Sponsorship (XLS-68/69)** — the platform can cover an XRP-poor wallet's reserve and
  fee for a trustline, verified against a holder funded with zero margin.
- **RLUSD as a second lending asset**, alongside native XRP, on the same vault/broker
  design.
- **Vault shares as MPTokens (XLS-33)** — a lender's real, yield-bearing share of the
  vault, not a separate ledger kept by the app.
- **A liquidity buffer** — if the vault can't cover a withdrawal yet because the
  borrower hasn't repaid, a platform wallet advances it, capped at its own balance.

## How it's built

A TypeScript monorepo, one package per concern, plumbed together by hand in
`apps/api/src/composition.ts` (no DI container):

| Path | What lives there |
| --- | --- |
| `apps/client/` | React Native / Expo app, web-first |
| `apps/api/` | Fastify HTTP API — the only place use cases get exposed |
| `apps/worker/` | Reserved for async jobs; not used yet |
| `packages/domain/` | Pure business rules and guards, no I/O |
| `packages/application/` | Use cases and ports; Postgres and in-memory adapters live here |
| `packages/contracts/` | Shared zod schemas and types |
| `packages/xrpl/` | XRPL adapters: Lending V1, Credentials/Domains, Sponsorship, wallet provisioning |
| `packages/credit/` | Pure credit-scoring math (revenue, AR/AP, balance sheet, composite score → grade → sizing), no I/O |
| `packages/agents/`, `packages/mcp/` | Bounded LLM orchestration and tool access — never signs or submits a transaction itself |
| `packages/ui/` | Shared components and design tokens |
| `services/optimizer/` | Deterministic Python forecasting engine, independent of the API and the XRPL SDK |
| `infra/` | Environment config, database migrations, deployment scripts |

A request only ever reaches XRPL or Postgres through a port defined in
`packages/application`; the API layer has no business logic or authorization of its
own, and the same holds for the worker and MCP entry points. See
[docs/architecture.md](docs/architecture.md) for the full picture and
[docs/v2.2/Octro_CDC_v2.2.md](docs/v2.2/Octro_CDC_v2.2.md) for the underlying spec this
was built against.

## Network

Custom Hackathon Devnet (`wss://lending-hackathon.dev.ripplex.io:51233`, network id
4001, rippled 3.4.0-rc1). One vault and one loan broker per asset, bootstrapped once by
an admin script and reused across the app rather than recreated per user.

## Proof of execution

Everything below is a real, validated transaction on the devnet above — see
[PROOF_OF_EXECUTION.md](docs/progress/samet/evidence/PROOF_OF_EXECUTION.md) for every
hash and explorer link.

- Open-ended vault created for both assets (XRP and RLUSD), each with its loan broker.
- Lender deposits into both vaults.
- Five loans originated and accepted (borrower + broker owner, coordinated signature),
  across both assets.
- Drawdown, confirmed through the vault's balance deltas on the `LoanSet` itself — this
  build doesn't emit a separate `Drawdown` transaction.
- Two loans repaid in full, amount read back from the ledger, never computed
  client-side.
- Withdrawals both funded directly by the vault and advanced by the liquidity buffer
  when the vault came up short.
- Three separate protocol-level rejections, each with its own explorer link: the vault
  refusing a withdrawal it can't yet cover (`tecINSUFFICIENT_FUNDS`), a broker refusing
  to be deleted while it still holds loans (`tecHAS_OBLIGATIONS`), and — the guardrail
  the team specifically asked to see demonstrated — a wallet that never went through
  Octro's sign-up, KYC or credit review trying to repay someone else's loan and getting
  turned down by the ledger itself (`tecNO_PERMISSION`).
- Credentials issued and accepted for real users, a Permissioned Domain created, a
  sponsored trustline for a zero-margin wallet, and a new account being activated
  on-chain automatically at sign-up.

Also documented there, in the interest of not hiding anything: three real bugs this
work surfaced and fixed along the way, including one where a retry before a fix landed
sent more XRP out of the liquidity buffer than intended, and hasn't been reconciled in
the database yet.
