import type { IouSetupPort } from "@octro/xrpl";
import type { ParsedLendingAsset } from "./lending-asset.js";

// Etablit automatiquement la trustline vers l'issuer d'un actif IOU (ex.
// RLUSD simule) avant un depot/retrait/emprunt/remboursement — l'utilisateur
// ne doit jamais avoir a la creer lui-meme. No-op pour l'actif XRP natif.
// TrustSet est idempotent (met juste a jour la limite si elle existe deja).
//
// Best-effort et jamais bloquant : si le compte n'est pas encore finance
// (aucun XRP, donc pas encore active sur le ledger), cette etape echoue
// silencieusement et l'operation principale suit son cours normalement —
// son propre PortResult explicite portera alors la vraie cause de l'echec,
// plutot que ce garde-fou ne la masque derriere une exception generique.
export async function ensureTrustline(
  asset: ParsedLendingAsset,
  holderSeed: string,
  iouSetup: IouSetupPort,
): Promise<void> {
  const ledgerAsset = asset.ledgerAsset;
  if (ledgerAsset.currency === "XRP") return;
  const { currency, issuer } = ledgerAsset as { currency: string; issuer: string };
  await iouSetup
    .createTrustline({ holderSeed, currency, issuerAddress: issuer, limit: "1000000000" })
    .catch(() => undefined);
}
