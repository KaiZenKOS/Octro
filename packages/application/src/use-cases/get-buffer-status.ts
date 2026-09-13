import type { AccountActivityPort } from "@octro/xrpl";
import type { BufferLedgerRepository } from "../ports/buffer-ledger-repository.js";

const BUFFER_ASSET_ID = "xrpl:XRP"; // le buffer n'existe qu'en XRP natif (wallet unique fourni par l'equipe)

export interface BufferAdvance {
  amount: string;
  balance_after: string;
  created_at: string;
}

export interface BufferStatus {
  asset_id: string;
  address: string;
  // Solde reel sur le ledger (autorite finale), pas seulement notre grand
  // livre interne — les deux peuvent legerement diverger si une avance a
  // ete tentee hors de ce chemin applicatif.
  on_chain_balance: string | null;
  advances: BufferAdvance[];
}

// Page Info publique (transparence) : solde reel du wallet buffer et
// historique des avances qu'il a deja faites (Phase F, repli de liquidite
// quand le vault n'a pas encore assez pour honorer un retrait).
export class GetBufferStatusUseCase {
  constructor(
    private readonly bufferLedger: BufferLedgerRepository,
    private readonly accountActivity: AccountActivityPort,
    private readonly bufferWalletAddress: string,
  ) {}

  async execute(): Promise<BufferStatus> {
    const [balances, entries] = await Promise.all([
      this.bufferWalletAddress ? this.accountActivity.getBalances(this.bufferWalletAddress) : Promise.resolve(null),
      this.bufferLedger.listByAssetId(BUFFER_ASSET_ID),
    ]);

    const onChainBalance =
      balances && balances.outcome === "ready" ? balances.data.find((b) => b.asset_id === BUFFER_ASSET_ID)?.value ?? null : null;

    const advances = entries
      .filter((e) => e.entryType === "advance")
      .map((e) => ({
        // amount est stocke negatif pour une avance (delta signe) — affiche
        // en valeur absolue, plus lisible pour un montant avance.
        amount: e.amount.startsWith("-") ? e.amount.slice(1) : e.amount,
        balance_after: e.balanceAfter,
        created_at: e.createdAt.toISOString(),
      }));

    return { asset_id: BUFFER_ASSET_ID, address: this.bufferWalletAddress, on_chain_balance: onChainBalance, advances };
  }
}
