import type { IouSetupPort } from "@octro/xrpl";

// Doublure de test/dev : jamais un vrai appel reseau. Utilisee tant que
// LENDING_V1_ENABLED n'est pas "true" (voir composition.ts), meme principe
// que FakeLendingV1Adapter/FakeBufferDisbursementAdapter.
export class FakeIouSetupAdapter implements IouSetupPort {
  private counter = 0;

  private evidence(stepId: string, txType: string) {
    this.counter += 1;
    return {
      scenario_id: "fake-iou-setup",
      step_id: stepId,
      tx_type: txType,
      tx_hash: `FAKE-IOU-${this.counter}`,
      result_code: "tesSUCCESS",
      validated: true,
      ledger_index: this.counter,
    };
  }

  async activateDefaultRipple(): ReturnType<IouSetupPort["activateDefaultRipple"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("default_ripple", "AccountSet") };
  }

  async createTrustline(): ReturnType<IouSetupPort["createTrustline"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("trustline", "TrustSet") };
  }

  async sendIouPayment(): ReturnType<IouSetupPort["sendIouPayment"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("iou_payment", "Payment") };
  }
}
