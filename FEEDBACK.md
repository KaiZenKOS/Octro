**Developer Feedback — Octro**
XRPL Lending Protocol Hackathon, Paris, 12–13 September 2026
Track 1, open-ended vault · Loaded · Lending Protocol V1 Network: Custom Hackathon Devnet (network id 4001), rippled 3.4.0-rc1, xrpl@5.2.0, Node v22.23.1
Team: Kevin, Samet, Augustin

The overall developer experience this weekend was a massive step up from ETH Oxford 2025. Between the newer tooling and AI integrations, building on XRPL felt significantly smoother. Back at Oxford, we constantly pinged Maxime and Thomas just to decode the DID documentation; this time, we barely needed to ask any basic questions. That gap alone speaks volumes about how much DevRel has improved. Everything below is pulled from real work sessions on the actual devnet.

**Encountered Issues & Friction Points**

* **Browser Wallet Custom-Network Bug:** Right out of the gate, we hit a bug in the provided open-source browser wallet’s custom-network support. The feature was there but broken. We patched it locally to keep our momentum going and will push a PR upstream soon.
* **Funded Accounts Phantom Transaction:** Autofill grabs the account's sequence via `account_info` before the faucet's funding transaction validates. This guesses a sequence one step too low, causing a silent failure where the transaction never validates but throws no clear error.
* **LoanSet’s Missing Counterparty Signature:** `LoanSet` is secretly a two-party transaction requiring the broker owner’s `CounterpartySignature`. Failing to provide it yields a generic `temBAD_SIGNER` code instead of flagging the missing party. We had to dig into `loanSet.d.ts` in the SDK to figure it out.
* **The tfLoanFullPayment Rounding Trap:** `tfLoanFullPayment` demands an exact match against the ledger's unrounded `PeriodicPayment` (e.g., 10,001,369.863 drops), but clients can only submit whole drops. The transaction gets included, rolls back with `tecKILLED`, and charges a fee anyway.
* **Faucet Mismatch:** The faucet response doesn't match `fundWallet()`, throwing an `XRPLFaucetError` that looks like an outage. We bypassed this by POSTing to the faucet directly.
* **SDK vs Node Limits:** `validateLoanSet` enforces `MIN_PAYMENT_INTERVAL = 60`, but the node rejects 60 with a generic `temINVALID`. Setting it to 3600 works.
* **Contradictory Errors:** On this fast devnet, `submitAndWait` sometimes returns confusing messages like "greater than the transaction's LastLedgerSequence... Preliminary result: tesSUCCESS."
* **Hidden DomainIDs:** `VaultCreate`'s `DomainID` doesn't stay on the vault itself; it lives on the share `MPTokenIssuance` under `vault_info.shares.DomainID`.
* **VaultSet Privacy:** Modifying a public vault with `VaultSet` and a `DomainID` throws an unexplained `tecNO_PERMISSION`. The vault must be set to private first.
* **Undocumented DIDSet Limits:** A full W3C DID document triggers `temMALFORMED`; you have to use a short JSON object instead.
* **DevEx Hook Quirks:** The capture hook occasionally misreads Python constants as result codes, and its text-based duplicate checker prevents resubmitting a reflection if the wrong session ID was entered initially.
* **Missing Setup Warnings:** The active amendment set wasn't clearly announced. The ledger ran V1 and V1.1 together, but V1.1 restricts new loans to closed-ended vaults, which caused some initial confusion.

**What Actually Rocked**

* **Credentials & Permissioned Domains:** Worked exactly as advertised. Denying, accepting, and expiring access gave clear, distinct error codes (`tecNO_AUTH`, `tecEXPIRED`) on the first try.
* **Native Fee Sponsorship:** Flawless out of the box with `addPreFundedSponsor`/`signAsSponsor`. The deltas perfectly confirmed who paid what.
* **DID Replay Protection:** Accurately caught wrong networks (`telWRONG_NETWORK`) and bad signers (`tefBAD_AUTH`).
* **Core Vault Operations:** Vault creation, deposits, broker setup, and withdrawals all validated on the very first correct submission.
