# Proof of Execution — Octro (Track 1 Loaded)

Every transaction listed below is real: submitted and validated on the **Custom
Hackathon Devnet** (`wss://lending-hackathon.dev.ripplex.io:51233`, build `3.4.0-rc1`).
Each explorer link points to a transaction that was actually **included in a validated
ledger** (`tes*`/`tec*` result classes) — never a `tem*`/`tel*`/`ter*` rejection (those
never make it into a ledger; querying one afterwards just returns `txnNotFound`, so no
explorer link is possible. We hit exactly this case while gathering evidence and dropped
it — see §8). Everything here was checked directly against the ledger via
`tx`/`account_tx`/`account_objects`/`ledger_entry`, never assumed from application logs
alone.

Explorer prefix: `https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/<hash>`

## Key accounts and objects

| Role | Address | Object |
| --- | --- | --- |
| XRP pool owner | `rnwAMTwzKXA4xmqTCG5XgQzGPfCYYHRVc9` | Vault `7C0863F889333CE229CB542FDF7F1CCCF8C596E07706AA7EA8FCABCD88C0FCDB`, Broker `1DDF75AB78F9FAF975E3D7A3FD9C1EC599EF6B6747919C784C9C14F04A0848B8` |
| RLUSD pool owner | `rEArkNsZ5Hgx5iCWj8cFNUBXrUTEMjRciZ` | Vault `C561D42333E43276488CD3373CC5D36F453B8A17E1A63758FB4636DCD2B8F3AF`, Broker `137A56BA6EDE8239DD91BB5E334D0BF9CEAA229CA4D0EE1B0DE8CB0C0D5B9C56` |
| RLUSD issuer | `raPseaSbTg3F7fZVZw7GVFsaitGmswqfxB` | Simulated IOU issuer |
| Lender (`lend@octro.co`) | `rGwseC6hdi3ZuqdaDYNDSenS1ga7te1XPK` | Real application account |
| Borrower (`borrow@octro.co`) | `r4nwPMiZGLuvcghGf9k6VPkreAoCvHWN3o` | Real application account |
| Buffer wallet / sponsor / platform credential issuer | `rESwf8WNEdjPdC2ovcDnrAw3aiknsjNQyq` | Single platform role (SEC-04, seed lives in `.env`) |

## Summary — hackathon minimum bar

| # | Use case | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Create an open-ended, single-asset vault | ✅ | §1 |
| 2 | Deposit from at least one lender | ✅ | §2 |
| 3 | Loan broker + a loan originated and accepted by a borrower | ✅ | §3 |
| 4 | Execute a drawdown | ✅ | §4 |
| 5 | Process at least one repayment | ✅ | §5 |
| 6 | Withdraw capital + accrued yield | ✅ | §6 |
| 7 | A protocol guardrail rejecting a transaction | ✅ (3 real examples) | §7 |

---

## 1. Open-ended, single-asset vault (Track 1)

The vault stays open for deposits and withdrawals for its entire lifetime — only loans
are term-bound (`docs/v2.2/hackathon.config.json`, `"vault": "open-ended"`). Two real
vaults, one per asset:

| Asset | Tx | Result | Link |
| --- | --- | --- | --- |
| XRP | `3B1DFA0A88BC7CE14C2B4F9890B32A905B719A61B51C87D4978262B9D340A108` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/3B1DFA0A88BC7CE14C2B4F9890B32A905B719A61B51C87D4978262B9D340A108) |
| RLUSD (simulated IOU) | `684DF616D903788C6C27CD80E471403F9A39491D3892B6D88CDE3BD8CD9C84E1` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/684DF616D903788C6C27CD80E471403F9A39491D3892B6D88CDE3BD8CD9C84E1) |

Loan broker attached to each vault:

| Asset | Tx | Result | Link |
| --- | --- | --- | --- |
| XRP | `8AE4426FF87810D8F4F223424CC29E0E7BEFC86FAA99645B9E14CC2BACC6C93D` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/8AE4426FF87810D8F4F223424CC29E0E7BEFC86FAA99645B9E14CC2BACC6C93D) |
| RLUSD | `960575D7CFCB55D108AC84F148C883BB0993DBE2F9E010E6AE602F63664DCB44` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/960575D7CFCB55D108AC84F148C883BB0993DBE2F9E010E6AE602F63664DCB44) |

First-loss cover deposited by the broker owner (RLUSD):
[`E383348EECB1251BD768262B3D2F7D799A0DCF5DF1DEB62C5076DE5AFD37EF9A`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/E383348EECB1251BD768262B3D2F7D799A0DCF5DF1DEB62C5076DE5AFD37EF9A)
— `tesSUCCESS`.

## 2. Lender deposit

| Asset | Amount | Tx | Result | Link |
| --- | --- | --- | --- | --- |
| XRP | 50 XRP | `6FA00F1328E0A9CD86519B1BBB94050E5A5BAF8D0A791724798B09ED6F5F015B` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/6FA00F1328E0A9CD86519B1BBB94050E5A5BAF8D0A791724798B09ED6F5F015B) |
| XRP (top-up before the withdrawal test) | 30 XRP | `D5A8880DF9F0B02FFDC79863CD91515867A4B11FCAB8B3DA7D10AFC6D61A252E` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/D5A8880DF9F0B02FFDC79863CD91515867A4B11FCAB8B3DA7D10AFC6D61A252E) |
| RLUSD | 50 RLUSD | `B9471D4CC5A9B2E37F6874D00AE309826D3D99F41C910DBE72483377F066FAA4` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B9471D4CC5A9B2E37F6874D00AE309826D3D99F41C910DBE72483377F066FAA4) |

Vault shares (MPToken, XLS-33): visible client-side under `/transactions` (Wallet
Overview → "Vault shares"), read directly from the vault's MPTokenIssuance.

## 3. Loan origination and acceptance

Five real loans were originated over the course of the session (the borrower has a
single persistent account, so several `Loan` objects pile up over time — which is
actually what surfaced the bug in §9a):

| Loan (`LoanID`) | Asset | Principal | `LoanSet` tx | Current status | Link |
| --- | --- | --- | --- | --- | --- |
| `82162493CA3C5A28…` | XRP | 10 XRP | `BBC472FD0A44E7C527A687D776E4D101FAF74C62BED82795CA5225A3CFD2C646` | repaid | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BBC472FD0A44E7C527A687D776E4D101FAF74C62BED82795CA5225A3CFD2C646) |
| `346D9A26C6047EDB…` | XRP | 20 XRP | `896C3BFCC0D964AD97F464F5785BC304EB3E0017951B74CD5D3602FA88295A6D` | repaid | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/896C3BFCC0D964AD97F464F5785BC304EB3E0017951B74CD5D3602FA88295A6D) |
| `673A9023D50F22B8…` | RLUSD | 10 RLUSD | `E209D5508BA6E643D8D84F2C1444079ADAFCC4B005E1AF5FD220886BFB145AD2` | active | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/E209D5508BA6E643D8D84F2C1444079ADAFCC4B005E1AF5FD220886BFB145AD2) |
| `86B6DC8ED34DFFF4…` | XRP | 20 XRP | `6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81` | active | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81) |
| `5382E06E16C01FB2…` | XRP | 5 XRP | `139DF1E449F68730A6036839AFDA56ECDCE4E37A26E431652C4F18EEA61D7FCE` | active (target of the §7c test) | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/139DF1E449F68730A6036839AFDA56ECDCE4E37A26E431652C4F18EEA61D7FCE) |

Each `LoanSet` above is a **coordinated** transaction (the borrower's signature plus the
broker owner's countersignature), so the borrower's acceptance and the broker's
origination are one and the same validated transaction.

## 4. Drawdown

As already documented by Augustin
(`docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json`, `drawdown` step):
this build doesn't produce a separate `Drawdown` transaction. The disbursement is
confirmed by the balance deltas on the `LoanSet` itself — the borrower receives the
principal (minus the network fee), and the vault's `AssetsAvailable` drops by the same
amount while `AssetsTotal` stays unchanged (the principal is still counted as a vault
asset while the loan is outstanding). Checked on loan `86B6DC8ED34DFFF4…`: borrower
balance +20 XRP (± fee) at the ledger of transaction
`6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81`.

## 5. Repayment

| Loan | Amount actually repaid | `LoanPay` tx | Result | Link |
| --- | --- | --- | --- | --- |
| `82162493CA3C5A28…` (10 XRP) | 10.320548 XRP | `025B1C28FDB82FA9C79AE790AF2A13D35F273E8F7FCA6425FDAA9FF58A9DB589` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/025B1C28FDB82FA9C79AE790AF2A13D35F273E8F7FCA6425FDAA9FF58A9DB589) |
| `346D9A26C6047EDB…` (20 XRP) | 20.213699 XRP | `F8F46BB4C9864A8D7E81BA79E970F03217DE7C03962257D74CD50B45BC1EB4DA` | `tesSUCCESS` | [view](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/F8F46BB4C9864A8D7E81BA79E970F03217DE7C03962257D74CD50B45BC1EB4DA) |

The repayment amount is never typed in by the client: it's read back from
`TotalValueOutstanding` right before submitting (`GET /v1/lending/loans/outstanding`) —
the only amount that actually closes out the loan.

## 6. Withdrawal — principal + yield, straight from the vault and via the buffer

**a) Withdrawal funded directly by the vault** (10 XRP + real yield):
[`B256C37609F0398DAF127AB47BF967B02093536994DCCBF34BD1E9EAAC47EF82`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B256C37609F0398DAF127AB47BF967B02093536994DCCBF34BD1E9EAAC47EF82)
— `tesSUCCESS`.

**b) Withdrawal advanced by the liquidity buffer** (the vault doesn't have enough
liquidity yet, PER-11/Phase F): the `VaultWithdraw` is first rejected by the protocol
(`tecINSUFFICIENT_FUNDS`, see §7a), and the buffer then advances the requested amount
(35 XRP) from its own wallet:
[`48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5)
— `tesSUCCESS`, a `Payment` from `rESwf8WNEdjPdC2ovcDnrAw3aiknsjNQyq` to
`rGwseC6hdi3ZuqdaDYNDSenS1ga7te1XPK`, confirmed and linked in the database
(`withdrawal_requests.funded_from = "buffer"`, matching `buffer_ledger` entry).

## 7. Protocol guardrails (rejected transactions)

Three distinct, real guardrails, each validated on a ledger (`tec*` class, so each has a
genuine explorer link — see the note at the top of this document about `tem*` rejections,
which don't).

### a) Vault doesn't have enough liquidity

A withdrawal is requested while the vault doesn't yet have enough liquidity available
(the borrower hasn't repaid yet):
[`C6050B4637509EF9DBC552B9DD8C8ECF343A579B170544B87B70389AF85D60B4`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/C6050B4637509EF9DBC552B9DD8C8ECF343A579B170544B87B70389AF85D60B4)
— `VaultWithdraw` → `tecINSUFFICIENT_FUNDS`. This exact rejection is what triggers the
buffer fallback (§6b) — a non-`"ready"` `PortResult` is **never** treated as a success on
the application side.

### b) Loan broker still has obligations

Attempt to delete the XRP loan broker while it still carries active loans:
[`F097E794CB82A01CC1FC0A7A00E2CF5331E9DECF49DCDD385FBB4A35F99C831A`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/F097E794CB82A01CC1FC0A7A00E2CF5331E9DECF49DCDD385FBB4A35F99C831A)
— `LoanBrokerDelete` → `tecHAS_OBLIGATIONS`.

### c) A wallet Octro never onboarded, interacting with a loan (explicit ask)

A **freshly generated wallet that never went through Octro's sign-up, KYC, or credit
review** — so it holds no on-chain `Credential` and has no application-level
relationship to the loan — attempts to repay (`LoanPay`) an active loan that belongs to
a different borrower (`borrow@octro.co`, loan `5382E06E16C01FB2…`, 5 XRP):

- Uncertified wallet: `raDqz1DAa4n38k9g17QUN97VGWG3dmtz2f` (generated purely for this
  test, funded with 15 XRP relayed from the buffer wallet just so it could sign — no
  sign-up, no KYC, no credential ever issued to this address).
- Transaction: `LoanPay` on `LoanID = 5382E06E16C01FB2787F7C97B5DF336167DB6D27675EE43DF6CBBEEB57AE065C`
- Result: **`tecNO_PERMISSION`** — *"No permission to perform requested operation."*
- Validated at ledger `82708`.
- Link: [`A12CCE231CD63BCFAF5E07F554F46D9E58AC303043A1C8D80ADF1668AA043DC3`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/A12CCE231CD63BCFAF5E07F554F46D9E58AC303043A1C8D80ADF1668AA043DC3)

The XRPL protocol itself refuses the operation (the wallet is neither the loan's
borrower nor an account the loan broker recognizes) — the refusal is enforced by the
ledger, not just by Octro's application code.

*(A first attempt — a solo `LoanSet` with no countersignature — was rejected
`temBAD_SIGNER`, but a follow-up check confirmed it came back `txnNotFound`: a `tem*`
transaction never enters a validated ledger, so no explorer link is possible for it.
That's why the test above (`LoanPay` against an existing loan) was used instead — it
produces a `tec*` rejection, validated and linkable.)*

## 8. Loaded extensions already verified for real

### Credentials + Permissioned Domains (LOAD-01, LOAD-03)

- `CredentialCreate` (simulated KYC → on-chain attestation, lender):
  [`C091BD1B35C1F8F34CC7551FDB02DF9C7E8BEB40C12AEAD2F4340FD0EC908E50`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/C091BD1B35C1F8F34CC7551FDB02DF9C7E8BEB40C12AEAD2F4340FD0EC908E50) — `tesSUCCESS`
- `CredentialAccept` (lender):
  [`34B7EF4F994100F3E95F05BD5A1EFC8F17D7080F87BA01398A8BEC002AA4C893`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/34B7EF4F994100F3E95F05BD5A1EFC8F17D7080F87BA01398A8BEC002AA4C893) — `tesSUCCESS`
- `CredentialCreate` (borrower, fixed on 2026-09-13 — see §9c):
  [`BE0C4F3F72B42A0504599593BF9D9D370E74AADABB8D8AD80286D1622AE56A5C`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BE0C4F3F72B42A0504599593BF9D9D370E74AADABB8D8AD80286D1622AE56A5C) — `tesSUCCESS`
- `CredentialAccept` (borrower):
  [`BFD74AD08ABBCEE0B6DE18057C131AF19E2CCFDA1EF77E2D00E7946A6344250E`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BFD74AD08ABBCEE0B6DE18057C131AF19E2CCFDA1EF77E2D00E7946A6344250E) — `tesSUCCESS`
- `PermissionedDomainSet` (domain created, `AcceptedCredentials` populated):
  [`0D2183F8C76E91A25EE8672B3384ADFBFDFE4A48BAF1E7F238995EFEE440AFA6`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/0D2183F8C76E91A25EE8672B3384ADFBFDFE4A48BAF1E7F238995EFEE440AFA6) — `tesSUCCESS`

Deliberate decision: the domain is never attached to the shared production vault (no
use-case calls `bindDomainToVault` against it) — this keeps `"vault": "open-ended"`
intact.

### Sponsorship (XLS-68/69)

A `TrustSet` whose reserve **and** fee are both covered by the sponsor
(`SponsorFlags.spfSponsorReserve | spfSponsorFee = 3`), for a holder funded at the bare
minimum (no margin at all):
[`CC496D9627167D36980136EABE1614B3AC36C1EB2E4AE2BF642BD0995E7AF7DE`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/CC496D9627167D36980136EABE1614B3AC36C1EB2E4AE2BF642BD0995E7AF7DE)
— `tesSUCCESS`, holder `rsYbYib9QmMhXgExevDd4ye3nTjWkHUH2p`, sponsor = the buffer wallet.

### Automatic wallet activation at sign-up

Fixed on 2026-09-13 (see §9c): a new account now receives a best-effort `Payment` from
the buffer wallet at sign-up (13 XRP = 10 XRP base reserve + 2 XRP incremental reserve
for the first owned `Credential` + 1 XRP fee headroom — figures checked against this
exact devnet's own `server_state`, not assumed from mainnet). Demonstrated end to end on
a disposable test account (its address and Postgres rows were deleted afterwards; the
on-chain trail stays public):

- Activation `Payment` (13 XRP):
  [`4E1C4498417A31B6D58F4BCD0646D133449D6DB2A38DE9BF434C2F622B833483`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/4E1C4498417A31B6D58F4BCD0646D133449D6DB2A38DE9BF434C2F622B833483) — `tesSUCCESS`
- Follow-up `CredentialCreate` (right after simulating KYC "valid"):
  [`B1849CEB3B12470DBCA5738C0673741A135E0D4DDE21E30B7E59782F449E051D`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B1849CEB3B12470DBCA5738C0673741A135E0D4DDE21E30B7E59782F449E051D) — `tesSUCCESS`
- Follow-up `CredentialAccept`:
  [`BBB638C9F1B6DD59F925202B57D4C30DC904BFDD5D7BA6BB6152E9F8242988FB`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BBB638C9F1B6DD59F925202B57D4C30DC904BFDD5D7BA6BB6152E9F8242988FB) — `tesSUCCESS`

## 9. Real bugs found and fixed during this session (in the interest of transparency)

Found by actually running these flows against the real devnet and real Postgres, not in
a unit test:

**a) Non-deterministic `account_objects[0]`** — a second loan for the same borrower
could pick up the wrong `loan_id` in the database (the lookup grabbed the first object
of the right type instead of the one *this specific transaction* created). Fixed by
reading `CreatedNode.LedgerIndex` off the transaction's own `AffectedNodes`
(`lending-v1.ts`, `credentials-domains.ts`). One already-corrupted row was repaired by
hand after cross-checking it against the account's 5 real `Loan` objects.

**b) `buffer_ledger` written before `withdrawal_requests`** — violated the
`buffer_ledger_withdrawal_request_id_fkey` foreign key (never exercised before against
real Postgres, only against in-memory test doubles that don't enforce constraints).
While fixing this, a real consequence surfaced during this evidence-gathering pass: the
**two failed attempts before the fix had each already sent a genuine 35 XRP `Payment`**
from the buffer before crashing on the constraint —
`45A1155F59FA3971104C667D528CA2E5874B0EB51347406B5300E809CF0963C3` and
`B155420844E205E03FEF3B1ACE102AC1B45C41AE56A91B27CD4B5296D67990C8`, on top of the
`48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5` that finally got
persisted (§6b). So the buffer actually disbursed 105 XRP for what was meant to be a
single 35 XRP withdrawal; only the last attempt has a matching
`withdrawal_requests`/`buffer_ledger` row. **Not reconciled yet** — needs fixing before
this is reused beyond the hackathon (the application's
`bufferLedger.getCurrentBalance()` is currently overstated by 70 XRP relative to the
buffer wallet's real on-chain balance).

**c) Missing wallet activation** — a new account was never actually funded on the
ledger (`actNotFound`), so `CredentialAccept` failed silently (it's a best-effort path,
§8) whenever KYC turned "valid" before the user had been funded through some other flow.
Fixed by the automatic activation payment described in §8. The `borrow@octro.co` account
(pre-existing, funded later on by other tests) was repaired by hand — re-running the KYC
simulation once its wallet actually held XRP — see the `CredentialCreate`/
`CredentialAccept` pair in §8.

## 10. Documented limitations (not bugs)

- Each lender's withdrawable balance is computed from Postgres alone (confirmed
  deposits minus honored withdrawals) — `LendingV1Port` exposes no way to read a
  lender's actual share of the shared vault (an accepted limitation, see the ADR).
- The buffer only exists in native XRP: an advance for an IOU vault (RLUSD) is capped
  at 0 for lack of a compatible balance.
- Item 9b above remains an open reconciliation gap — flagged here, not swept under
  the rug.
