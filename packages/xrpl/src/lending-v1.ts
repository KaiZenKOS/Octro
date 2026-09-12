/**
 * Lending V1 vault/broker/loan adapter (A3, XRP-02, XRP-04, HACK-02).
 *
 * The full cycle is verified for real on the Custom Hackathon Devnet
 * (see docs/progress/augustin.md and docs/progress/augustin/evidence/):
 *   - createVault       -> tesSUCCESS
 *   - depositToVault    -> tesSUCCESS
 *   - setLoanBroker     -> tesSUCCESS
 *   - acceptLoan        -> tesSUCCESS (coordinated LoanSet, see below)
 *   - repayLoan         -> tesSUCCESS
 *   - withdrawFromVault -> tesSUCCESS, including real accrued interest
 *
 * acceptLoan needed a CounterpartySignature from the loan broker's
 * owner (chapter 16: "LoanSet peut nécessiter la coordination du
 * courtier et de l'emprunteur"). A first, uncoordinated, borrower-only
 * LoanSet was rejected pre-inclusion with temBAD_SIGNER (kept as
 * evidence of a real protocol protection, HACK-03/AC-L04). The
 * coordinated flow below fixes that: the borrower signs normally with
 * wallet.sign(), then the broker owner co-signs the same transaction
 * with xrpl.js's signLoanSetByCounterparty() before submission.
 *
 * repayLoan: a first attempt with Amount = the ledger-rounded
 * TotalValueOutstanding and Flags = tfLoanFullPayment was included in
 * a validated ledger but rolled back with tecKILLED ("No funds
 * transferred and no offer created") — the true payoff is the
 * unrounded PeriodicPayment, not representable as an integer drop
 * amount, and the full-payment flag seems to require an exact match.
 * Repaying the same rounded Amount with Flags = 0 (a plain payment,
 * not an explicit full-payment) succeeded and closed the loan. This
 * adapter therefore never sets tfLoanFullPayment.
 */
import { Client, Wallet, xrpToDrops, signLoanSetByCounterparty } from "xrpl";
import { LendingV1Port } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

interface SubmitOutcome {
  hash: string;
  submitPreliminary: string;
  validated: boolean;
  resultCode: string | null;
  ledgerIndex: number | null;
}

async function pollForValidation(
  client: Client,
  hash: string,
  submitPreliminary: string,
  timeoutMs = 60000
): Promise<SubmitOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResp = await client.request({ command: "tx", transaction: hash } as any);
    if ((txResp.result as any).validated) {
      const result = txResp.result as any;
      return {
        hash,
        submitPreliminary,
        validated: true,
        resultCode: result.meta.TransactionResult,
        ledgerIndex: result.ledger_index,
      };
    }
  }
  return { hash, submitPreliminary, validated: false, resultCode: null, ledgerIndex: null };
}

async function submitAndConfirm(
  client: Client,
  wallet: Wallet,
  tx: Record<string, unknown>,
  timeoutMs = 60000
): Promise<SubmitOutcome> {
  (tx as { Account?: string }).Account = wallet.classicAddress;
  const currentLedger = await client.getLedgerIndex();
  const prepared = await client.autofill(tx as any);
  (prepared as any).LastLedgerSequence = currentLedger + 2000;
  const signed = wallet.sign(prepared as any);
  const submitResp = await client.submit(signed.tx_blob);
  return pollForValidation(client, signed.hash, submitResp.result.engine_result as string, timeoutMs);
}

function toEvidence(scenarioId: string, stepId: string, txType: string, outcome: SubmitOutcome): TransactionEvidence {
  return {
    scenario_id: scenarioId,
    step_id: stepId,
    tx_type: txType,
    tx_hash: outcome.hash,
    submit_preliminary_result: outcome.submitPreliminary,
    result_code: outcome.resultCode,
    validated: outcome.validated,
    ledger_index: outcome.ledgerIndex,
    explorer_url: EXPLORER_PREFIX + outcome.hash,
  };
}

export class XrplLendingV1Adapter implements LendingV1Port {
  constructor(private readonly wssUrl: string) {}

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.disconnect();
    }
  }

  async createVault(params: {
    ownerSeed: string;
    asset: { currency: "XRP" } | { currency: string; issuer: string };
  }): Promise<PortResult<{ vaultId: string }>> {
    return this.withClient(async (client) => {
      const owner = Wallet.fromSeed(params.ownerSeed);
      const outcome = await submitAndConfirm(client, owner, {
        TransactionType: "VaultCreate",
        Asset: params.asset,
      });
      const evidence = toEvidence("lending-v1", "vault_create", "VaultCreate", outcome);
      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      const objects = await client.request({
        command: "account_objects",
        account: owner.classicAddress,
        type: "vault",
      } as any);
      const vaultId = (objects.result as any).account_objects[0]?.index ?? null;
      if (!vaultId) {
        return { outcome: "degraded", reason: "VaultCreate validated but no vault object found by account_objects" };
      }
      return { outcome: "ready", data: { vaultId }, evidence };
    });
  }

  async depositToVault(params: {
    depositorSeed: string;
    vaultId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const depositor = Wallet.fromSeed(params.depositorSeed);
      const outcome = await submitAndConfirm(client, depositor, {
        TransactionType: "VaultDeposit",
        VaultID: params.vaultId,
        Amount: params.amountDrops,
      });
      const evidence = toEvidence("lending-v1", "deposit", "VaultDeposit", outcome);
      return outcome.resultCode === "tesSUCCESS"
        ? { outcome: "ready", data: {}, evidence }
        : { outcome: "rejected", evidence };
    });
  }

  async setLoanBroker(params: {
    ownerSeed: string;
    vaultId: string;
    debtMaximumDrops: string;
    managementFeeRate: number;
  }): Promise<PortResult<{ loanBrokerId: string }>> {
    return this.withClient(async (client) => {
      const owner = Wallet.fromSeed(params.ownerSeed);
      const outcome = await submitAndConfirm(client, owner, {
        TransactionType: "LoanBrokerSet",
        VaultID: params.vaultId,
        DebtMaximum: params.debtMaximumDrops,
        ManagementFeeRate: params.managementFeeRate,
      });
      const evidence = toEvidence("lending-v1", "broker_setup", "LoanBrokerSet", outcome);
      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      const objects = await client.request({
        command: "account_objects",
        account: owner.classicAddress,
        type: "loan_broker",
      } as any);
      const loanBrokerId = (objects.result as any).account_objects[0]?.index ?? null;
      if (!loanBrokerId) {
        return { outcome: "degraded", reason: "LoanBrokerSet validated but no loan_broker object found" };
      }
      return { outcome: "ready", data: { loanBrokerId }, evidence };
    });
  }

  async acceptLoan(params: {
    borrowerSeed: string;
    brokerOwnerSeed: string;
    loanBrokerId: string;
    principalDrops: string;
    interestRateHundredThousandths: number;
    paymentIntervalSeconds: number;
    paymentTotal: number;
    gracePeriodSeconds: number;
  }): Promise<PortResult<{ loanId: string }>> {
    return this.withClient(async (client) => {
      const borrower = Wallet.fromSeed(params.borrowerSeed);
      const brokerOwner = Wallet.fromSeed(params.brokerOwnerSeed);

      const currentLedger = await client.getLedgerIndex();
      const prepared = await client.autofill({
        TransactionType: "LoanSet",
        Account: borrower.classicAddress,
        LoanBrokerID: params.loanBrokerId,
        Counterparty: brokerOwner.classicAddress,
        PrincipalRequested: params.principalDrops,
        InterestRate: params.interestRateHundredThousandths,
        PaymentInterval: params.paymentIntervalSeconds,
        PaymentTotal: params.paymentTotal,
        GracePeriod: params.gracePeriodSeconds,
      } as any);
      (prepared as any).LastLedgerSequence = currentLedger + 2000;

      // First party (borrower) signs normally, then the counterparty
      // (loan broker owner) co-signs the same transaction blob.
      const borrowerSigned = borrower.sign(prepared as any);
      const coSigned = signLoanSetByCounterparty(brokerOwner, borrowerSigned.tx_blob);

      const submitResp = await client.submit(coSigned.tx_blob);
      const outcome = await pollForValidation(client, coSigned.hash, submitResp.result.engine_result as string);
      const evidence = toEvidence("lending-v1", "loan_acceptance_coordinated", "LoanSet", outcome);

      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      const objects = await client.request({
        command: "account_objects",
        account: borrower.classicAddress,
        type: "loan",
      } as any);
      const loanId = (objects.result as any).account_objects[0]?.index ?? null;
      if (!loanId) {
        return { outcome: "degraded", reason: "LoanSet validated but no loan object found by account_objects" };
      }
      return { outcome: "ready", data: { loanId }, evidence };
    });
  }

  async repayLoan(params: {
    borrowerSeed: string;
    loanId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const borrower = Wallet.fromSeed(params.borrowerSeed);
      // Deliberately Flags: 0. A prior real attempt with the
      // tfLoanFullPayment flag on the same rounded Amount was rolled
      // back with tecKILLED; a plain payment for the same amount
      // succeeded and closed the loan (see file header).
      const outcome = await submitAndConfirm(client, borrower, {
        TransactionType: "LoanPay",
        LoanID: params.loanId,
        Amount: params.amountDrops,
        Flags: 0,
      });
      const evidence = toEvidence("lending-v1", "repayment", "LoanPay", outcome);
      return outcome.resultCode === "tesSUCCESS"
        ? { outcome: "ready", data: {}, evidence }
        : { outcome: "rejected", evidence };
    });
  }

  async withdrawFromVault(params: {
    withdrawerSeed: string;
    vaultId: string;
    amountDrops: string;
  }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const withdrawer = Wallet.fromSeed(params.withdrawerSeed);
      const outcome = await submitAndConfirm(client, withdrawer, {
        TransactionType: "VaultWithdraw",
        VaultID: params.vaultId,
        Amount: params.amountDrops,
      });
      const evidence = toEvidence("lending-v1", "vault_withdraw", "VaultWithdraw", outcome);
      return outcome.resultCode === "tesSUCCESS"
        ? { outcome: "ready", data: {}, evidence }
        : { outcome: "rejected", evidence };
    });
  }
}

export { xrpToDrops };
