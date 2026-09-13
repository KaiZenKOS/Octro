import type { LoanQueryPort } from "@octro/xrpl";

// Doublure de test/dev : jamais un vrai appel reseau. Utilisee tant que
// LENDING_V1_ENABLED n'est pas "true" (voir composition.ts), meme principe
// que FakeLendingV1Adapter/FakeAccountActivityAdapter. Renvoie un solde nul
// (pret cense deja rembourse) — les tests qui ont besoin d'un montant
// precis le forcent via une sous-classe ou un mock local.
export class FakeLoanQueryAdapter implements LoanQueryPort {
  async getOutstanding(): ReturnType<LoanQueryPort["getOutstanding"]> {
    return {
      outcome: "ready",
      data: {
        totalValueOutstanding: "0",
        principalOutstanding: "0",
        paymentRemaining: 0,
        nextPaymentDueDate: null,
        defaulted: false,
      },
    };
  }
}
