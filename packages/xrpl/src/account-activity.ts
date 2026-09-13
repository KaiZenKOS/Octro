import { Client } from "xrpl";
import type { AccountActivityPort, AccountBalance, AccountTransactionSummary, VaultShareBalance } from "./ports.js";
import type { QueryResult } from "./ports.js";

const EXPLORER_TX_PREFIX = "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

// Reconstruit un asset_id (@octro/contracts, "xrpl:XRP" ou
// "xrpl:<code>:<issuer>") depuis un montant tel que renvoye par le ledger.
// Un code non-standard (40 hex, ex. RLUSD) est redecode en ASCII pour
// l'affichage quand c'est possible — sinon garde le code hex tel quel.
function currencyToAssetId(currency: string, issuer: string): string {
  if (/^[0-9A-Fa-f]{40}$/.test(currency)) {
    const ascii = Buffer.from(currency, "hex").toString("ascii").replace(/\0+$/, "");
    if (ascii.length > 0 && /^[\x20-\x7E]+$/.test(ascii)) return `xrpl:${ascii}:${issuer}`;
  }
  return `xrpl:${currency}:${issuer}`;
}

function toAccountBalance(amount: string | { currency: string; issuer: string; value: string }): AccountBalance {
  if (typeof amount === "string") {
    return { asset_id: "xrpl:XRP", value: (Number(amount) / 1_000_000).toString() };
  }
  return { asset_id: currencyToAssetId(amount.currency, amount.issuer), value: amount.value };
}

// Lecture seule (account_info, account_lines, account_tx) : jamais de
// signature, jamais de soumission — la vue "compte" du client (soldes +
// historique on-chain reel), distincte des actions applicatives deja
// loguees cote Postgres/Mongo.
export class XrplAccountActivityAdapter implements AccountActivityPort {
  constructor(private readonly wssUrl: string) {}

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.disconnect();
    }
  }

  async getBalances(address: string): Promise<QueryResult<AccountBalance[]>> {
    try {
      return await this.withClient(async (client) => {
        const balances: AccountBalance[] = [];
        try {
          const xrp = await client.getXrpBalance(address);
          balances.push({ asset_id: "xrpl:XRP", value: String(xrp) });
        } catch (err) {
          if ((err as { data?: { error?: string } })?.data?.error === "actNotFound") {
            balances.push({ asset_id: "xrpl:XRP", value: "0" });
          } else {
            throw err;
          }
        }
        const lines = await client.request({ command: "account_lines", account: address });
        for (const line of lines.result.lines) {
          if (Number(line.balance) === 0) continue;
          balances.push({ asset_id: currencyToAssetId(line.currency, line.account), value: line.balance });
        }
        return { outcome: "ready" as const, data: balances };
      });
    } catch (err) {
      return { outcome: "unavailable", reason: err instanceof Error ? err.message : "unknown error" };
    }
  }

  async getTransactions(address: string, limit = 20): Promise<QueryResult<AccountTransactionSummary[]>> {
    try {
      return await this.withClient(async (client) => {
        let response;
        try {
          response = await client.request({
            command: "account_tx",
            account: address,
            limit,
            ledger_index_min: -1,
            ledger_index_max: -1,
          });
        } catch (err) {
          if ((err as { data?: { error?: string } })?.data?.error === "actNotFound") {
            return { outcome: "ready" as const, data: [] };
          }
          throw err;
        }

        const summaries: AccountTransactionSummary[] = [];
        for (const entry of response.result.transactions ?? []) {
          const tx = (entry as { tx_json?: Record<string, unknown> }).tx_json;
          const meta = entry.meta;
          if (!tx || !meta || typeof meta !== "object") continue;
          const deliveredRaw = (meta as { delivered_amount?: unknown }).delivered_amount;
          const delivered =
            typeof deliveredRaw === "string" || (deliveredRaw && typeof deliveredRaw === "object")
              ? toAccountBalance(deliveredRaw as string | { currency: string; issuer: string; value: string })
              : null;
          const account = tx["Account"] as string | undefined;
          const destination = tx["Destination"] as string | undefined;
          const direction: AccountTransactionSummary["direction"] =
            destination === address ? "incoming" : account === address ? "outgoing" : "other";
          const hash = (entry as { hash?: string }).hash ?? "";
          summaries.push({
            tx_hash: hash,
            tx_type: (tx["TransactionType"] as string) ?? "Unknown",
            result_code: typeof (meta as { TransactionResult?: unknown }).TransactionResult === "string"
              ? (meta as { TransactionResult: string }).TransactionResult
              : "unknown",
            validated: Boolean((entry as { validated?: boolean }).validated),
            ledger_index: (entry as { ledger_index?: number }).ledger_index ?? 0,
            occurred_at: (entry as { close_time_iso?: string }).close_time_iso ?? null,
            delivered_amount: delivered,
            direction,
            counterparty: direction === "outgoing" ? destination ?? null : direction === "incoming" ? account ?? null : null,
            explorer_url: EXPLORER_TX_PREFIX + hash,
          });
        }
        return { outcome: "ready" as const, data: summaries };
      });
    } catch (err) {
      return { outcome: "unavailable", reason: err instanceof Error ? err.message : "unknown error" };
    }
  }

  // Integration MPToken (bonus) : chaque Vault (XLS-65) represente la part
  // d'un lender par un MPToken (XLS-33) sous son propre pseudo-compte
  // (Vault.ShareMPTID). Verifie en reel : le MPTAmount detenu croit avec le
  // rendement accumule, jamais fige au montant depose.
  async getVaultShares(
    address: string,
    knownVaults: Array<{ assetId: string; vaultId: string }>,
  ): Promise<QueryResult<VaultShareBalance[]>> {
    try {
      return await this.withClient(async (client) => {
        const shareIdToAsset = new Map<string, { assetId: string; assetScale: number }>();
        for (const vault of knownVaults) {
          try {
            const { result } = await client.request({ command: "ledger_entry", index: vault.vaultId } as any);
            const node = (result as any).node;
            const shareMptId = node?.ShareMPTID as string | undefined;
            if (!shareMptId) continue;
            // AssetScale n'est fiable que pour un Vault IOU (nos deux pools
            // l'ont verifie : RLUSD -> 6, coherent avec sa valeur decimale ;
            // XRP -> absent/0 alors que ses MPTAmount restent en DROPS,
            // jamais mis a l'echelle par le Vault) — jamais s'y fier pour
            // XRP, toujours utiliser la conversion drops->XRP standard.
            const isNativeXrp = vault.assetId === "xrpl:XRP";
            const assetScale = isNativeXrp ? 6 : ((await client.request({ command: "ledger_entry", mpt_issuance: shareMptId } as any)).result as any).node?.AssetScale ?? 0;
            shareIdToAsset.set(shareMptId, { assetId: vault.assetId, assetScale });
          } catch {
            // Un vault connu introuvable/injoignable est ignore, jamais
            // bloquant pour les autres.
          }
        }

        const holdings = await client.request({ command: "account_objects", account: address, type: "mptoken" } as any);
        const shares: VaultShareBalance[] = [];
        for (const holding of (holdings.result as any).account_objects ?? []) {
          const match = shareIdToAsset.get(holding.MPTokenIssuanceID);
          if (!match) continue;
          const scaled = Number(holding.MPTAmount) / 10 ** match.assetScale;
          shares.push({ asset_id: match.assetId, shares: scaled.toString() });
        }
        return { outcome: "ready" as const, data: shares };
      });
    } catch (err) {
      return { outcome: "unavailable", reason: err instanceof Error ? err.message : "unknown error" };
    }
  }
}
