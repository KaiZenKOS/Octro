// Vault ouvert + loan broker partages par tous les lenders/borrowers d'un
// meme actif (decision actee) : une ligne par asset_id, creee une fois par
// BootstrapLendingPoolUseCase. La seed du wallet proprietaire est chiffree
// (ownerSeedCiphertext) — distinct du wallet buffer (Phase F), role separe
// (propriete du vault/broker vs avance de tresorerie). Integration
// xrpl-lending-sim : plusieurs actifs (XRP + RLUSD simule), chacun son pool.
export interface LendingPoolRecord {
  id: string;
  assetId: string;
  vaultId: string;
  loanBrokerId: string;
  ownerAddress: string;
  ownerSeedCiphertext: string;
  createdAt: Date;
}

export interface LendingPoolRepository {
  save(pool: LendingPoolRecord): Promise<void>;
  getByAssetId(assetId: string): Promise<LendingPoolRecord | null>;
  // Integration xrpl-lending-sim (client) : liste des actifs disponibles a
  // la depose/emprunt (asset_id + vault_id, jamais la seed chiffree du
  // proprietaire) — alimente le selecteur d'actif du frontend.
  listAll(): Promise<LendingPoolRecord[]>;
}
