/**
 * Basic Payment adapter — the G0 smoke test transaction (A1, HACK-01).
 * Verified for real on 2026-09-12: tesSUCCESS, see
 * docs/progress/augustin/evidence/g0-basic-payment.json.
 */
import { Client, Wallet } from "xrpl";
import { PaymentPort } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";
import { buildPaymentTransaction } from "./transaction-builders.js";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

export class XrplPaymentAdapter implements PaymentPort {
  constructor(private readonly wssUrl: string) {}

  async sendTestPayment(params: {
    sourceSeed: string;
    destinationAddress: string;
    amountDrops: string;
  }): Promise<PortResult<{ txHash: string }>> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const source = Wallet.fromSeed(params.sourceSeed);
      const currentLedger = await client.getLedgerIndex();
      const prepared = await client.autofill(buildPaymentTransaction({
        account: source.classicAddress,
        destination: params.destinationAddress,
        amountDrops: params.amountDrops,
      }));
      (prepared as any).LastLedgerSequence = currentLedger + 2000;
      const signed = source.sign(prepared as any);
      const submitResp = await client.submit(signed.tx_blob);

      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const txResp = await client.request({ command: "tx", transaction: signed.hash } as any);
        if ((txResp.result as any).validated) {
          const result = txResp.result as any;
          const evidence: TransactionEvidence = {
            scenario_id: "g0",
            step_id: "basic_payment",
            tx_type: "Payment",
            tx_hash: signed.hash,
            submit_preliminary_result: submitResp.result.engine_result as string,
            result_code: result.meta.TransactionResult,
            validated: true,
            ledger_index: result.ledger_index,
            explorer_url: EXPLORER_PREFIX + signed.hash,
          };
          return result.meta.TransactionResult === "tesSUCCESS"
            ? { outcome: "ready", data: { txHash: signed.hash }, evidence }
            : { outcome: "rejected", evidence };
        }
      }
      return {
        outcome: "degraded",
        reason: `Payment ${signed.hash} was not validated within the timeout`,
      };
    } finally {
      await client.disconnect();
    }
  }
}
