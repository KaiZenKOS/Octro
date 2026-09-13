# Octro — Track 1 Loaded

A real XRPL Lending Protocol V1 integration for businesses: connect your own Odoo,
get underwritten against your actual numbers, borrow against it or lend into the
shared vault. Built for the XRPL Lending Protocol Hackathon (DeVinci Blockchain ×
Ripple).

**Developer feedback from the hackathon:** [FEEDBACK.md](FEEDBACK.md)
**Full proof of execution (every real transaction, with explorer links):** [docs/progress/samet/evidence/PROOF_OF_EXECUTION.md](docs/progress/samet/evidence/PROOF_OF_EXECUTION.md)

## What it does

The one real, end-to-end product in this build today is business lending, and the
whole point of it is cutting default risk before a loan goes out. A business signs up,
clears KYC, and connects its own Odoo instance; Octro pulls that company's actual
sales, invoicing and accounting data and runs a real underwriting check against it —
only once that check passes does the business get to draw a loan, sized to what it can
plausibly repay. Anyone can be a lender and deposit capital into the shared XRPL vault;
being a borrower means being a business with real books behind it. Deposit, loan
origination, drawdown, repayment, withdrawal are all real signed XRPL transactions.

Track 1 means the vault is open-ended: it stays open for deposits and withdrawals for
its whole life, only the loans inside it have a term.

### KYC and credit scoring

These are two different checks, both aimed at the same goal — knowing who a borrower
is and whether they can actually repay, before capital goes out the door:

- **KYC is a sandboxed decision today.** There's no real identity-verification
  provider wired up yet (the plan is Didit, currently dormant) — a user picks
  approve/reject and the app follows the same downstream path a real provider's
  answer would. An approval still isn't just a flag in a database, though: it mints a
  real on-chain `Credential` between the platform and the user's wallet
  (`CredentialCreate` + `CredentialAccept`), checkable against the ledger.
- **Credit scoring is fully real, and it's what actually decides whether a business
  can borrow.** A company connects its own Odoo instance (BYO, Odoo's External JSON-2
  API), and Octro pulls its real sales orders, invoices, vendor bills and
  general-ledger lines through that API — no mock data, no canned score. `packages/credit`
  runs a proper underwriting model on it: revenue scale, profitability, growth and
  volatility, collections, balance-sheet health, customer concentration and operating
  history, each scored and weighted into a composite score, mapped to a letter grade,
  which drives a recommended credit line sized three independent ways (cash-flow
  capacity, a revenue-based cap, a DSCR-based cap — whichever is tightest wins), plus
  an approve / approve-with-conditions / decline call. That call is what stands between
  a business and a loan it can't service. Odoo is currently the only ERP connector;
  the underwriting engine itself is written against a plain data shape, not against
  Odoo's API directly, so adding another ERP later is a new adapter, not a rewrite.

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
