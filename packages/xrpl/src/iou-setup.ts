/**
 * Mise en place d'un actif IOU (RLUSD simule) — port fidele de
 * xrpl-lending-sim/simulate.js (setupIssuer/ensureTrustline/fundWithIou),
 * deja verifie en reel sur ce devnet : AccountSet asfDefaultRipple sur
 * l'issuer, TrustSet du holder vers l'issuer, Payment initial de l'issuer.
 * N'a aucun effet sur le chemin XRP natif.
 */
import { Client, Wallet } from "xrpl";
import { IouSetupPort } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";

const EXPLORER_PREFIX = "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";
const ASF_DEFAULT_RIPPLE = 8;

interface SubmitOutcome {
  hash: string;
  submitPreliminary: string;
  validated: boolean;
  resultCode: string | null;
  ledgerIndex: number | null;
}

async function pollForValidation(client: Client, hash: string, submitPreliminary: string, timeoutMs = 60000): Promise<SubmitOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResp = await client.request({ command: "tx", transaction: hash } as any);
    if ((txResp.result as any).validated) {
      const result = txResp.result as any;
      return { hash, submitPreliminary, validated: true, resultCode: result.meta.TransactionResult, ledgerIndex: result.ledger_index };
    }
  }
  return { hash, submitPreliminary, validated: false, resultCode: null, ledgerIndex: null };
}

async function submitAndConfirm(client: Client, wallet: Wallet, tx: Record<string, unknown>): Promise<SubmitOutcome> {
  (tx as { Account?: string }).Account = wallet.classicAddress;
  const currentLedger = await client.getLedgerIndex();
  const prepared = await client.autofill(tx as any);
  (prepared as any).LastLedgerSequence = currentLedger + 2000;
  const signed = wallet.sign(prepared as any);
  const submitResp = await client.submit(signed.tx_blob);
  return pollForValidation(client, signed.hash, submitResp.result.engine_result as string);
}

function toEvidence(stepId: string, txType: string, outcome: SubmitOutcome): TransactionEvidence {
  return {
    scenario_id: "iou-setup",
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

function toResult(outcome: SubmitOutcome, stepId: string, txType: string): PortResult<{}> {
  const evidence = toEvidence(stepId, txType, outcome);
  return outcome.resultCode === "tesSUCCESS" ? { outcome: "ready", data: {}, evidence } : { outcome: "rejected", evidence };
}

export class XrplIouSetupAdapter implements IouSetupPort {
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

  async activateDefaultRipple(params: { issuerSeed: string }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const issuer = Wallet.fromSeed(params.issuerSeed);
      const outcome = await submitAndConfirm(client, issuer, { TransactionType: "AccountSet", SetFlag: ASF_DEFAULT_RIPPLE });
      return toResult(outcome, "issuer_account_set", "AccountSet");
    });
  }

  async createTrustline(params: { holderSeed: string; currency: string; issuerAddress: string; limit: string }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const holder = Wallet.fromSeed(params.holderSeed);
      const outcome = await submitAndConfirm(client, holder, {
        TransactionType: "TrustSet",
        LimitAmount: { currency: params.currency, issuer: params.issuerAddress, value: params.limit },
      });
      return toResult(outcome, "trustline", "TrustSet");
    });
  }

  async sendIouPayment(params: { issuerSeed: string; destinationAddress: string; currency: string; value: string }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const issuer = Wallet.fromSeed(params.issuerSeed);
      const outcome = await submitAndConfirm(client, issuer, {
        TransactionType: "Payment",
        Destination: params.destinationAddress,
        Amount: { currency: params.currency, issuer: issuer.classicAddress, value: params.value },
      });
      return toResult(outcome, "fund_iou", "Payment");
    });
  }
}
