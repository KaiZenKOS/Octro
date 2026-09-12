import { validate, Wallet } from "xrpl";
import { describe, expect, it } from "vitest";
import { XrplDidAdapter } from "../src/did.js";
import { XrplSponsorshipAdapter } from "../src/sponsorship.js";
import {
  buildCredentialAcceptTransaction,
  buildCredentialCreateTransaction,
  buildDidSetTransaction,
  buildLoanBrokerSetTransaction,
  buildLoanPayTransaction,
  buildLoanSetTransaction,
  buildPaymentTransaction,
  buildPermissionedDomainSetTransaction,
  buildVaultCreateTransaction,
  buildVaultDepositTransaction,
  buildVaultSetDomainTransaction,
  buildVaultWithdrawTransaction,
  TRACK1_NETWORK_ID,
  withTrack1NetworkId,
} from "../src/transaction-builders.js";

const ACCOUNT = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER_ACCOUNT = "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV";
const LEDGER_ID = "A".repeat(64);

function validateWithAccount(transaction: object): void {
  validate({ ...transaction, Account: ACCOUNT });
}

describe("Track 1 adapter payloads (HACK-01/02, XRP-01, LOAD-01/02/03, ARCH-LOAD-01)", () => {
  it("pins every Track 1 builder to NetworkID 4001 and uses the V1 open-ended vault shape", () => {
    const vault = buildVaultCreateTransaction({ account: ACCOUNT, asset: { currency: "XRP" } });
    expect(TRACK1_NETWORK_ID).toBe(4001);
    expect(vault).toMatchObject({ TransactionType: "VaultCreate", NetworkID: 4001, Asset: { currency: "XRP" } });
    expect(vault).not.toHaveProperty("AssetsMaximum");
    expect(vault).not.toHaveProperty("Flags");
    validateWithAccount(vault);

    const privateVault = buildVaultCreateTransaction({ account: ACCOUNT, asset: { currency: "XRP" }, domainId: LEDGER_ID });
    expect(privateVault).toMatchObject({ NetworkID: 4001, DomainID: LEDGER_ID, Flags: 0x00010000 });
    validateWithAccount(privateVault);

    const payloads = [
      buildVaultDepositTransaction({ account: ACCOUNT, vaultId: LEDGER_ID, amountDrops: "1000000" }),
      buildLoanBrokerSetTransaction({ account: ACCOUNT, vaultId: LEDGER_ID, debtMaximumDrops: "80000000", managementFeeRate: 0 }),
      buildLoanSetTransaction({
        borrowerAddress: ACCOUNT,
        brokerOwnerAddress: OTHER_ACCOUNT,
        loanBrokerId: LEDGER_ID,
        principalDrops: "9000000",
        interestRateHundredThousandths: 5000,
        paymentIntervalSeconds: 86400,
        paymentTotal: 1,
        gracePeriodSeconds: 0,
      }),
      buildLoanPayTransaction({ account: ACCOUNT, loanId: LEDGER_ID, amountDrops: "9000000" }),
      buildVaultWithdrawTransaction({ account: ACCOUNT, vaultId: LEDGER_ID, amountDrops: "1000000" }),
      buildPaymentTransaction({ account: ACCOUNT, destination: OTHER_ACCOUNT, amountDrops: "1" }),
    ];
    for (const payload of payloads) {
      expect(payload.NetworkID).toBe(4001);
      validateWithAccount(payload);
    }
    expect(payloads.map((payload) => payload.TransactionType)).toEqual([
      "VaultDeposit", "LoanBrokerSet", "LoanSet", "LoanPay", "VaultWithdraw", "Payment",
    ]);
    expect(payloads[2]).toMatchObject({
      LoanBrokerID: LEDGER_ID,
      PrincipalRequested: "9000000",
      InterestRate: 5000,
      PaymentInterval: 86400,
      PaymentTotal: 1,
      GracePeriod: 0,
      Counterparty: OTHER_ACCOUNT,
    });
  });

  it("rejects an accidental NetworkID drift before the SDK or network sees a payload", () => {
    expect(() => withTrack1NetworkId({ TransactionType: "Payment", NetworkID: 21338 })).toThrow(/NetworkID 4001/);
  });

  it("keeps Credential authorization, Domain membership and vault binding as separate V1 fields", () => {
    const credentialCreate = buildCredentialCreateTransaction({
      account: ACCOUNT,
      subjectAddress: OTHER_ACCOUNT,
      credentialType: "OctroTest",
      expirationRippleTime: 900000000,
    });
    const credentialAccept = buildCredentialAcceptTransaction({ account: OTHER_ACCOUNT, issuerAddress: ACCOUNT, credentialType: "OctroTest" });
    const domainSet = buildPermissionedDomainSetTransaction({
      account: ACCOUNT,
      acceptedCredentials: [{ issuer: ACCOUNT, credentialType: "OctroTest" }],
    });
    const vaultSet = buildVaultSetDomainTransaction({ account: ACCOUNT, vaultId: LEDGER_ID, domainId: "B".repeat(64) });

    expect(credentialCreate).toMatchObject({
      TransactionType: "CredentialCreate", NetworkID: 4001, Subject: OTHER_ACCOUNT, CredentialType: "4F6374726F54657374",
      Expiration: 900000000,
    });
    expect(credentialAccept).toMatchObject({
      TransactionType: "CredentialAccept", NetworkID: 4001, Issuer: ACCOUNT, CredentialType: "4F6374726F54657374",
    });
    expect(domainSet).toMatchObject({
      TransactionType: "PermissionedDomainSet",
      AcceptedCredentials: [{ Credential: { Issuer: ACCOUNT, CredentialType: "4F6374726F54657374" } }],
    });
    expect(vaultSet).toMatchObject({ TransactionType: "VaultSet", VaultID: LEDGER_ID, DomainID: "B".repeat(64) });
    expect(credentialCreate).not.toHaveProperty("DomainID");
    expect(domainSet).not.toHaveProperty("VaultID");
    expect(vaultSet).not.toHaveProperty("AcceptedCredentials");

    for (const payload of [credentialCreate, credentialAccept, domainSet, vaultSet]) {
      expect(payload.NetworkID).toBe(4001);
      validateWithAccount(payload);
    }
  });

  it("keeps sponsorship behind a real reservation and does not infer a budget from SP0", async () => {
    const adapter = new XrplSponsorshipAdapter("wss://must-not-connect.invalid");
    const quote = await adapter.quoteSponsoredOperation({ beneficiaryAddress: ACCOUNT, transactionType: "Payment" });
    expect(quote.outcome).toBe("unavailable");

    const sponsor = Wallet.generate();
    const sponsee = Wallet.generate();
    const result = await adapter.sponsorPaymentFee({
      sponsorSeed: sponsor.seed,
      sponseeSeed: sponsee.seed,
      destinationAddress: OTHER_ACCOUNT,
      amountDrops: "1",
      reservation: {
        reservationId: "reserved-budget-1",
        sponsorAddress: sponsor.classicAddress,
        beneficiaryAddress: "not-the-sponsee",
        transactionType: "Payment",
        maxFeeDrops: "12",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        policyVersion: "test-policy",
      },
    });
    expect(result).toMatchObject({ outcome: "unavailable" });
  });

  it("keeps DID strictly an identity adapter with no eligibility or lending authority", () => {
    const methodNames = Object.getOwnPropertyNames(XrplDidAdapter.prototype);
    expect(methodNames).toEqual(["constructor", "publishDid", "resolveDid"]);
    const payload = buildDidSetTransaction({ account: ACCOUNT, didDocumentUtf8: "did-document" });
    expect(payload).toMatchObject({ TransactionType: "DIDSet", NetworkID: 4001, Account: ACCOUNT });
    expect(payload).not.toHaveProperty("eligible");
    expect(payload).not.toHaveProperty("creditDecision");
    validate(payload);
  });
});
