import type { IouSetupPort } from "@octro/xrpl";
import type { ParsedLendingAsset } from "./lending-asset.js";

// Etablit automatiquement la trustline vers l'issuer d'un actif IOU (ex.
// RLUSD simule) avant un depot/retrait/emprunt/remboursement — l'utilisateur
// ne doit jamais avoir a la creer lui-meme. No-op pour l'actif XRP natif.
// TrustSet est idempotent (met juste a jour la limite si elle existe deja).
//
// Integration Sponsorship (XLS-68/69) : si sponsorSeed est fourni, la
// plateforme prend en charge la reserve additionnelle (et les frais) de
// cette trustline (createSponsoredTrustline, verifie en reel : un compte
// tenu tout juste a la reserve de base, sans marge pour un objet
// supplementaire, a quand meme pu etablir la trustline, sponsor paye,
// solde du holder inchange) — reduit ce que l'utilisateur doit lui-meme
// detenir en XRP pour utiliser un actif IOU. Sans sponsorSeed, comportement
// inchange (createTrustline classique, holder paye).
//
// Best-effort et jamais bloquant : si le compte n'est pas encore finance
// du tout (aucun XRP, donc pas encore active sur le ledger — la
// sponsorisation ne peut pas creer un compte inexistant, verifie en reel :
// terNO_ACCOUNT), cette etape echoue silencieusement et l'operation
// principale suit son cours normalement — son propre PortResult explicite
// portera alors la vraie cause de l'echec, plutot que ce garde-fou ne la
// masque derriere une exception generique.
export async function ensureTrustline(
  asset: ParsedLendingAsset,
  holderSeed: string,
  iouSetup: IouSetupPort,
  sponsorSeed?: string,
): Promise<void> {
  const ledgerAsset = asset.ledgerAsset;
  if (ledgerAsset.currency === "XRP") return;
  const { currency, issuer } = ledgerAsset as { currency: string; issuer: string };
  const limit = "1000000000";
  await (sponsorSeed
    ? iouSetup.createSponsoredTrustline({ holderSeed, currency, issuerAddress: issuer, limit, sponsorSeed })
    : iouSetup.createTrustline({ holderSeed, currency, issuerAddress: issuer, limit })
  ).catch(() => undefined);
}
