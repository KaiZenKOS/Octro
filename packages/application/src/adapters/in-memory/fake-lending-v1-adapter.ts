import { randomUUID } from "node:crypto";
import type { LendingV1Port } from "@octro/xrpl";

type Params<M extends keyof LendingV1Port> = Parameters<LendingV1Port[M]>[0];

// Doublure de test/dev (Phase E) : jamais un vrai appel reseau, toujours un
// PortResult "ready" avec des identifiants synthetiques. Utilisee tant que
// LENDING_V1_ENABLED n'est pas "true" (voir composition.ts) — exactement le
// meme principe que RecordingMailAdapter pour MAIL_ENABLED ou les
// adaptateurs in-memory pour POSTGRES_ENABLED.
export class FakeLendingV1Adapter implements LendingV1Port {
  private counter = 0;

  // Reglable par les tests (ex. Phase F : forcer un retrait "rejected" pour
  // exercer le repli buffer de WithdrawFromVaultUseCase) — jamais utilise
  // par le chemin reel.
  forcedWithdrawOutcome: "rejected" | "unavailable" | "unsupported" | "degraded" | null = null;

  private evidence(stepId: string, txType: string) {
    this.counter += 1;
    return {
      scenario_id: "fake-lending-v1",
      step_id: stepId,
      tx_type: txType,
      tx_hash: `FAKE${this.counter}`,
      result_code: "tesSUCCESS",
      validated: true,
      ledger_index: this.counter,
    };
  }

  async createVault(_params: Params<"createVault">): ReturnType<LendingV1Port["createVault"]> {
    return { outcome: "ready", data: { vaultId: `fake-vault-${randomUUID()}` }, evidence: this.evidence("vault_setup", "VaultCreate") };
  }

  async depositToVault(_params: Params<"depositToVault">): ReturnType<LendingV1Port["depositToVault"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("deposit", "VaultDeposit") };
  }

  async depositCover(_params: Params<"depositCover">): ReturnType<LendingV1Port["depositCover"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("cover_deposit", "LoanBrokerCoverDeposit") };
  }

  async setLoanBroker(_params: Params<"setLoanBroker">): ReturnType<LendingV1Port["setLoanBroker"]> {
    return {
      outcome: "ready",
      data: { loanBrokerId: `fake-broker-${randomUUID()}` },
      evidence: this.evidence("broker_setup", "LoanBrokerSet"),
    };
  }

  async acceptLoan(_params: Params<"acceptLoan">): ReturnType<LendingV1Port["acceptLoan"]> {
    return {
      outcome: "ready",
      data: { loanId: `fake-loan-${randomUUID()}` },
      evidence: this.evidence("loan_acceptance_coordinated", "LoanSet"),
    };
  }

  async repayLoan(_params: Params<"repayLoan">): ReturnType<LendingV1Port["repayLoan"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("repayment", "LoanPay") };
  }

  async withdrawFromVault(_params: Params<"withdrawFromVault">): ReturnType<LendingV1Port["withdrawFromVault"]> {
    if (this.forcedWithdrawOutcome === "rejected") {
      return { outcome: "rejected", evidence: this.evidence("vault_withdraw", "VaultWithdraw") };
    }
    if (this.forcedWithdrawOutcome) {
      return { outcome: this.forcedWithdrawOutcome, reason: "forced by test" };
    }
    return { outcome: "ready", data: {}, evidence: this.evidence("vault_withdraw", "VaultWithdraw") };
  }
}
