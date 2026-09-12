export type BufferLedgerEntryType = "advance" | "replenish" | "manual_topup";

// Grand livre du buffer de liquidite (Phase F) : source de verite unique du
// solde courant, calcule comme le balanceAfterDrops de la derniere entree.
// amountDrops est le delta signe applique par cette entree (negatif pour une
// avance, positif pour un topup/replenish).
export interface BufferLedgerEntryRecord {
  id: string;
  withdrawalRequestId: string | null;
  entryType: BufferLedgerEntryType;
  amountDrops: string;
  balanceAfterDrops: string;
  txEvidence: Record<string, unknown> | null;
  createdAt: Date;
}

export interface BufferLedgerRepository {
  save(entry: BufferLedgerEntryRecord): Promise<void>;
  // null si le grand livre n'a jamais ete initialise (voir ensureSeeded).
  getCurrentBalanceDrops(): Promise<bigint | null>;
}
