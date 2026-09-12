// MongoDB : documents bruts uniquement, jamais de solde ni de decision
// d'acces (voir .env : "MongoDB: optional raw documents only; no financial
// balances or access decisions"). Ce port journalise la preuve XRPL brute
// et complete (TransactionEvidence, requete + reponse ledger) en plus du
// resume concis deja persiste dans le jsonb Postgres (tx_evidence) — jamais
// a la place. Aucun solde ni decision ne depend de cette collection.
export interface TxEvidenceEntry {
  userId: string | null; // null pour une operation d'administration (bootstrap du pool partage)
  assetId: string;
  operation: string;
  evidence: Record<string, unknown>;
  recordedAt: Date;
}

export interface TxEvidenceRepository {
  record(entry: TxEvidenceEntry): Promise<void>;
}
