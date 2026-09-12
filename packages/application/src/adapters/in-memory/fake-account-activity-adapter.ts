import type { AccountActivityPort } from "@octro/xrpl";

// Doublure de test/dev : jamais un vrai appel reseau. Utilisee tant que
// LENDING_V1_ENABLED n'est pas "true" (voir composition.ts), meme principe
// que FakeLendingV1Adapter/FakeBufferDisbursementAdapter.
export class FakeAccountActivityAdapter implements AccountActivityPort {
  async getBalances(): ReturnType<AccountActivityPort["getBalances"]> {
    return { outcome: "ready", data: [{ asset_id: "xrpl:XRP", value: "0" }] };
  }

  async getTransactions(): ReturnType<AccountActivityPort["getTransactions"]> {
    return { outcome: "ready", data: [] };
  }
}
