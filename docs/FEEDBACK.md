# Developer Feedback — Octro

*XRPL Lending Protocol Hackathon, Paris, 12–13 September 2026*

Track 1, open-ended vault · Loaded (Credentials, Permissioned Domains) · Lending Protocol V1
Network: Custom Hackathon Devnet (network id 4001), rippled 3.4.0-rc1, `xrpl@5.2.0`, Node v22.23.1
Team: Kevin, Samet, Augustin

Everything below happened during real work sessions on the actual devnet, not a dry
run of it. Where we have a hash, we link it. Where we don't, it's because the
transaction never made it into a ledger, and that absence is part of the finding. We're
reporting the three issues that cost us the most time, because they're the kind that
will hit any Track 1 team, not just us.

## 1. A funded account can submit a transaction that just disappears

We funded a new account through the event faucet, then immediately built and submitted
a `PermissionedDomainSet` with `autofill`. `submit` came back with `tesSUCCESS`, and the
transaction never validated — it sat unknown to the ledger for several minutes despite
a generous `LastLedgerSequence`. There's no hash to point to here, because nothing was
ever included; that's the whole problem.

The cause: `autofill` reads the account's `Sequence` via `account_info` before the
faucet's own funding payment has actually validated, so it picks a sequence one below
the account's real starting value — a number the account can never use. We confirmed
the real starting sequence afterwards with `account_tx`. Reproducing it is simple: fund
an account through the faucet, then call `autofill`/`submit` right away without waiting
for that funding to land.

It cost us about 15 minutes and a small debug script; the DevEx capture hook logged two
retry-resolved events six minutes apart while we worked it out.

**Fix:** have `fundWallet()` wait for its own funding transaction to validate before
returning, and have `autofill` refuse to guess a sequence for an account that isn't on
the validated ledger yet rather than silently picking a wrong one. A clear refusal
beats a transaction that quietly goes nowhere.

## 2. LoanSet needs the broker owner's signature, and temBAD_SIGNER doesn't say so

Vault, deposit and loan broker all went through cleanly. Then a `LoanSet` signed only
by the borrower, with a valid broker ID and principal, got rejected pre-inclusion with
`temBAD_SIGNER` — a code that names no field and gives no hint that a second party is
missing. [Rejected attempt](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B9A12BE23AAF37771569A6B46AD22A964E4A9D35D6157D06A05AEA1C39A75447).

`LoanSet` turns out to be a two-party transaction: it needs the broker owner's
`CounterpartySignature`. We only found this by reading `loanSet.d.ts` inside the
installed SDK and spotting `signLoanSetByCounterparty`/
`combineLoanSetCounterpartySigners`. The borrower signs first, the broker owner
co-signs the same `tx_blob`, and — with a single counterparty signer — no combine step
is needed. That got us a validated loan:
[`693C846F…`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/693C846FF98C75E74FDF147E549500101320EDF1A193E95E19592660929B6FE2)
(ledger 65045).

This took about 20 minutes, and we'd bet most Track 1 teams hit it before they think to
open the SDK source.

**Fix:** either a dedicated code (something like `temMISSING_COUNTERPARTY_SIG`) or name
the missing field in the message. The helpers already ship in the SDK — the docs just
never show them working together in one example.

## 3. tfLoanFullPayment wants an amount the client can't actually produce

Repaying a loan in full, we read `TotalValueOutstanding` off the `Loan` entry —
`10001370` drops — and submitted a `LoanPay` for that amount with `tfLoanFullPayment`
set. It got included, then rolled back with `tecKILLED` ("No funds transferred and no
offer created"), fee charged anyway.
[Attempt](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/28343EEE820EB27EEC7A1B5CC02E22005E6CD87E37E05365BF85ED3869B546BD)
(ledger 65064).

The real payoff turns out to be the unrounded `PeriodicPayment` the ledger actually
holds — `10001369.86301369963` — which isn't a whole number of drops, and the flag
seems to want an exact match against it. The ledger only ever shows the rounded figure,
so there's no way to get the exact one from a client. Submitting the same amount with
`Flags: 0` closed the loan fine:
[`EA2B4816…`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/EA2B4816AE06E08DA64FD8C6131C0410691951D3350A21A387ED092334A3C1F1).

**Fix:** publish an exact, submittable payoff amount on the loan object, let the flag
settle the true balance regardless of the `Amount` field sent, or round in the
borrower's favor. And have `tecKILLED` name the amount it expected instead of leaving
that to guesswork.

## Smaller things, in short

- **The faucet response doesn't match `fundWallet()`.** It returns an `account` object
  with `address`/`secret`, which the helper can't parse — it throws
  `XRPLFaucetError: The faucet account is undefined`, which reads like an outage. We
  POST to the faucet directly and build the wallet with `Wallet.fromSeed()`.
- **The SDK's own minimum is stricter than what rippled accepts.** `validateLoanSet`
  enforces `MIN_PAYMENT_INTERVAL = 60`, but the node rejects `PaymentInterval: 60` with
  a generic, field-less `temINVALID`. `3600` works.
- **`submitAndWait` produces a self-contradicting error** on this fast devnet —
  something like "greater than the transaction's LastLedgerSequence... Preliminary
  result: tesSUCCESS."
- **`VaultCreate`'s `DomainID` doesn't end up on the vault.** It lives on the share
  `MPTokenIssuance` instead, under `vault_info.shares.DomainID` — we only found it by
  dumping the whole response.
- **`VaultSet` with a `DomainID` needs the vault to already be private.** Trying it on
  a public vault gives `tecNO_PERMISSION` with no explanation
  ([attempt](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/6C50EA54AC253A56B94E77AFE8B6CD06E64C9A171700523767CC5A02BE783E9C));
  the same call worked once the vault was private.
- **`DIDSet` has an undocumented length limit.** A full W3C DID document triggers
  `temMALFORMED`; a short JSON object goes through fine.
- **The DevEx capture hook produced a couple of false positives** — it once read a
  Python constant name as a result code, and a `grep` over TypeScript imports as a
  `Payment`. Its duplicate check also keys on text alone, so a reflection submitted
  under the wrong session ID can't be resubmitted under the right one.
- **The active amendment set wasn't announced up front.** This ledger runs
  `LendingProtocol` and `LendingProtocolV1_1` together, and the event page separately
  warns that V1.1 restricts new loans to closed-ended vaults — worth stating plainly
  before the event starts, alongside the `feature` RPC output in the quickstart.

## What worked well

Credentials and Permissioned Domains did exactly what their names promise — deny,
accept, and deny-after-expiry all gave clear, distinct codes (`tecNO_AUTH`,
`tecEXPIRED`) on the first try. Native fee sponsorship worked immediately with
`addPreFundedSponsor`/`signAsSponsor`, and the balance deltas confirm the sponsor paid
the fee while the sponsee paid nothing. DID replay protection correctly rejected the
wrong network (`telWRONG_NETWORK`) and the wrong signer (`tefBAD_AUTH`). `VaultCreate`,
`VaultDeposit`, `LoanBrokerSet` and `VaultWithdraw` all validated on the first correct
submission.

## In our own words

One of us hit a bug in the browser wallet's custom-network support — the feature we
actually needed was finally there, just broken. Since the wallet is open source, we
patched it locally and got it running. Contributing that fix back upstream, and helping
improve the wallet further, is on our list.

The documentation is a real step up from ETH Oxford 2025. Between the AI integrations
and the newer tooling, building on XRPL feels noticeably smoother this time, and we
ended up asking far fewer basic questions than last time — at Oxford we were constantly
pinging Maxime and Thomas just to make sense of the DID docs. That gap on its own says
a lot about how much DevRel has improved since.

## Evidence

Full transaction records for the lending cycle, with hashes and explorer links:
`docs/progress/augustin/evidence/`. Our own end-to-end run — vault, deposit, broker,
loan, repayment, withdrawal, guardrails, Credentials/Domains, Sponsorship:
[`docs/progress/samet/evidence/PROOF_OF_EXECUTION.md`](progress/samet/evidence/PROOF_OF_EXECUTION.md).
Session captures behind this report: `.xrpl-devex/reports/`.
