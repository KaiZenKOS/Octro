/**
 * Lending V1 vault/broker/loan adapter (A3, XRP-02, XRP-04, HACK-02).
 *
 * Verified for real on the Custom Hackathon Devnet on 2026-09-12 (see
 * docs/progress/augustin.md and docs/progress/augustin/evidence/):
 *   - createVault      -> tesSUCCESS
 *   - depositToVault    -> tesSUCCESS
 *   - setLoanBroker     -> tesSUCCESS
 *   - withdrawFromVault -> tesSUCCESS
 *
 * NOT verified yet, deliberately left unsupported instead of guessed:
 *   - acceptLoan: LoanSet requires a CounterpartySignature from the
 *     loan broker's owner (chapter 16: "LoanSet peut nécessiter la
 *     coordination du courtier et de l'emprunteur"). A borrower-only
 *     LoanSet submitted during A1/A3 was rejected pre-inclusion with
 *     temBAD_SIGNER — a real, reproducible protocol-level refusal
 *     (HACK-03/AC-L04 evidence), not yet the coordinated success path.
 *   - repayLoan: cannot be exercised without a loan created first.
 */
import { Client, Wallet, xrpToDrops } from "xrpl";
import { LendingV1Port } from "./ports";
import { PortResult, TransactionEvidence } from "./types";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

interface SubmitOutcome {
  hash: string;
  submitPreliminary: string;
  validated: boolean;
  resultCode: string | null;
  ledgerIndex: number | null;
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

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResp = await client.request({ command: "tx", transaction: signed.hash } as any);
    if ((txResp.result as any).validated) {
      const result = txResp.result as any;
      return {
        hash: signed.hash,
        submitPreliminary: submitResp.result.engine_result as string,
        validated: true,
        resultCode: result.meta.TransactionResult,
        ledgerIndex: result.ledger_index,
      };
    }
  }
  return {
    hash: signed.hash,
    submitPreliminary: submitResp.result.engine_result as string,
    validated: false,
    resultCode: null,
    ledgerIndex: null,
  };
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

  async acceptLoan(): Promise<PortResult<{ loanId: string }>> {
    // Deliberately unsupported: LoanSet needs the broker owner's
    // CounterpartySignature (xrpl.js exposes signLoanSetByCounterparty /
    // combineLoanSetCounterpartySigners for this in 5.2.0, unused here).
    // An uncoordinated attempt during A1/A3 was rejected with
    // temBAD_SIGNER before touching consensus — a genuine protocol
    // protection, not a stand-in for this method.
    return {
      outcome: "unsupported",
      reason:
        "LoanSet counterparty co-signing is not implemented yet; a borrower-only " +
        "attempt is rejected pre-inclusion with temBAD_SIGNER (see docs/progress/augustin.md).",
    };
  }

  async repayLoan(): Promise<PortResult<{}>> {
    return {
      outcome: "unsupported",
      reason: "No loan has been created yet (acceptLoan is unsupported); repayment cannot be exercised.",
    };
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
