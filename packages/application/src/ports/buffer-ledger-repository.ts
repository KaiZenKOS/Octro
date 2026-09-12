export type BufferLedgerEntryType = "advance" | "replenish" | "manual_topup";

// Grand livre du buffer de liquidite (Phase F), un par actif (integration
// xrpl-lending-sim : XRP + RLUSD simule) : source de verite unique du solde
// courant, calcule comme le balanceAfter de la derniere entree. amount est
// le delta signe applique par cette entree (negatif pour une avance,
// positif pour un topup/replenish) — chaine decimale (drops XRP ou valeur
// IOU), jamais un flottant ; voir decimal-support.ts pour l'arithmetique.
export interface BufferLedgerEntryRecord {
  id: string;
  assetId: string;
  withdrawalRequestId: string | null;
  entryType: BufferLedgerEntryType;
  amount: string;
  balanceAfter: string;
  txEvidence: Record<string, unknown> | null;
  createdAt: Date;
}

export interface BufferLedgerRepository {
  save(entry: BufferLedgerEntryRecord): Promise<void>;
  // null si le grand livre n'a jamais ete initialise pour cet actif (voir
  // WithdrawFromVaultUseCase, amorcage a la premiere avance).
  getCurrentBalance(assetId: string): Promise<string | null>;
}
