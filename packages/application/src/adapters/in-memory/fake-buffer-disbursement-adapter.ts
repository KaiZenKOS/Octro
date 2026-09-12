import type { BufferDisbursementPort } from "@octro/xrpl";

// Doublure de test/dev (Phase F) : jamais un vrai appel reseau. Utilisee
// tant que LENDING_V1_ENABLED n'est pas "true" (voir composition.ts), meme
// principe que FakeLendingV1Adapter.
export class FakeBufferDisbursementAdapter implements BufferDisbursementPort {
  private counter = 0;

  async sendPayment(): ReturnType<BufferDisbursementPort["sendPayment"]> {
    this.counter += 1;
    const txHash = `FAKE-BUFFER-${this.counter}`;
    return {
      outcome: "ready",
      data: { txHash },
      evidence: {
        scenario_id: "fake-buffer-advance",
        step_id: "advance",
        tx_type: "Payment",
        tx_hash: txHash,
        result_code: "tesSUCCESS",
        validated: true,
        ledger_index: this.counter,
      },
    };
  }
}
