// Vault ouvert + loan broker partages par tous les lenders/borrowers
// (decision actee) : une seule ligne, creee une fois par
// BootstrapLendingPoolUseCase. La seed du wallet proprietaire est chiffree
// (ownerSeedCiphertext) — distinct du wallet buffer (Phase F), role separe
// (propriete du vault/broker vs avance de tresorerie).
export interface LendingPoolRecord {
  id: string;
  vaultId: string;
  loanBrokerId: string;
  ownerAddress: string;
  ownerSeedCiphertext: string;
  createdAt: Date;
}

export interface LendingPoolRepository {
  save(pool: LendingPoolRecord): Promise<void>;
  get(): Promise<LendingPoolRecord | null>;
}
