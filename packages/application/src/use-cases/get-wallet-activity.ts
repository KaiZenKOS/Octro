import type { AccountActivityPort, AccountBalance, AccountTransactionSummary, VaultShareBalance } from "@octro/xrpl";
import { NotFoundError } from "../errors.js";
import type { LendingPoolRepository } from "../ports/lending-pool-repository.js";
import type { WalletRepository } from "../ports/wallet-repository.js";

export interface GetWalletActivityQuery {
  userId: string;
}

export interface WalletActivityResult {
  address: string;
  network: string;
  balances: AccountBalance[];
  transactions: AccountTransactionSummary[];
  // Integration MPToken (bonus) : parts de vault reellement detenues (XLS-33
  // MPToken sous le pseudo-compte du Vault, XLS-65) — distinct d'un solde de
  // portefeuille classique, croit avec le rendement accumule.
  vault_shares: VaultShareBalance[];
}

// Vue "compte" (Phase G, correction UX) : le client n'affichait jusqu'ici
// ni l'adresse complete, ni un solde reel, ni un historique de
// transactions on-chain — seulement les actions applicatives deja
// loguees (LenderDeposit, WithdrawalRequest, ...). Une lecture XRPL en
// echec (compte non finance, endpoint injoignable) degrade en tableau
// vide plutot que de faire echouer tout l'ecran.
export class GetWalletActivityUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly accountActivity: AccountActivityPort,
    private readonly pools: LendingPoolRepository,
  ) {}

  async execute(query: GetWalletActivityQuery): Promise<WalletActivityResult> {
    const wallet = await this.wallets.findByUserId(query.userId);
    if (!wallet) {
      throw new NotFoundError("Wallet", query.userId);
    }
    const pools = await this.pools.listAll();
    const knownVaults = pools.map((pool) => ({ assetId: pool.assetId, vaultId: pool.vaultId }));

    const [balances, transactions, vaultShares] = await Promise.all([
      this.accountActivity.getBalances(wallet.address),
      this.accountActivity.getTransactions(wallet.address),
      this.accountActivity.getVaultShares(wallet.address, knownVaults),
    ]);

    // Affiche aussi un solde "0" pour chaque actif de lending connu (ex.
    // RLUSD simule) sans ligne de confiance encore etablie — l'utilisateur
    // doit voir que l'actif existe, pas seulement ceux qu'il detient deja.
    const knownBalances = balances.outcome === "ready" ? [...balances.data] : [];
    const seenAssetIds = new Set(knownBalances.map((b) => b.asset_id));
    for (const pool of pools) {
      if (!seenAssetIds.has(pool.assetId)) {
        knownBalances.push({ asset_id: pool.assetId, value: "0" });
        seenAssetIds.add(pool.assetId);
      }
    }

    return {
      address: wallet.address,
      network: wallet.network,
      balances: knownBalances,
      transactions: transactions.outcome === "ready" ? transactions.data : [],
      vault_shares: vaultShares.outcome === "ready" ? vaultShares.data : [],
    };
  }
}
