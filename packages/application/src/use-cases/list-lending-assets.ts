import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";

export interface LendingAssetSummary {
  asset_id: string;
  vault_id: string;
}

// Integration xrpl-lending-sim : alimente le selecteur d'actif du client
// (XRP natif deja amorce, RLUSD simule des qu'un second pool existe) — ne
// renvoie jamais ownerSeedCiphertext (jamais expose au client).
export class ListLendingAssetsUseCase {
  constructor(private readonly pools: LendingPoolRepository) {}

  async execute(): Promise<LendingAssetSummary[]> {
    const pools = await this.pools.listAll();
    return pools.map((pool) => ({ asset_id: pool.assetId, vault_id: pool.vaultId }));
  }
}
