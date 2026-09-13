import type { LedgerAmount } from "@octro/xrpl";

// Parse un asset_id (@octro/contracts, convention namespace:code[:issuer])
// en descripteur d'actif XRPL — integration xrpl-lending-sim (XRP natif +
// RLUSD simule, IOU). "xrpl:XRP" pour le natif ; "xrpl:<CODE>:<issuer>" pour
// un IOU (le code humain est encode au format ledger si besoin, ex. RLUSD
// -> 40 caracteres hex, comme lib.js/currencyCode dans xrpl-lending-sim).
export interface ParsedLendingAsset {
  assetId: string;
  ledgerAsset: { currency: "XRP" } | { currency: string; issuer: string };
  toLedgerAmount(nativeAmount: string): LedgerAmount;
}

function ledgerCurrencyCode(label: string): string {
  if (/^[A-Za-z0-9?!@#$%^&*(){}[\]|]{3}$/.test(label)) return label;
  return Buffer.from(label, "ascii").toString("hex").toUpperCase().padEnd(40, "0");
}

export function parseLendingAssetId(assetId: string): ParsedLendingAsset {
  const [namespace, code, issuer] = assetId.split(":");
  if (namespace !== "xrpl") {
    throw new Error(`unsupported lending asset_id (expected namespace "xrpl"): ${assetId}`);
  }
  if (code === "XRP") {
    return { assetId, ledgerAsset: { currency: "XRP" }, toLedgerAmount: (nativeAmount) => nativeAmount };
  }
  if (!code || !issuer) {
    throw new Error(`IOU lending asset_id requires "xrpl:<code>:<issuer>": ${assetId}`);
  }
  const currency = ledgerCurrencyCode(code);
  return {
    assetId,
    ledgerAsset: { currency, issuer },
    toLedgerAmount: (nativeAmount) => ({ currency, issuer, value: nativeAmount }),
  };
}

export function buildLendingAssetId(code: "XRP" | string, issuer?: string): string {
  return code === "XRP" ? "xrpl:XRP" : `xrpl:${code}:${issuer}`;
}

const XRP_DROPS_PER_UNIT = 1_000_000n;

// Convertit un montant humain en XRP (ex. "5000" ou "12.5") en drops, chaine
// via BigInt (jamais un flottant) — meme convention que apps/client/src/
// lending-data.ts#toLedgerAmount cote client.
function humanXrpToDrops(humanAmount: string): string {
  const trimmed = humanAmount.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const paddedFrac = (fracPart + "000000").slice(0, 6);
  const drops = BigInt(intPart || "0") * XRP_DROPS_PER_UNIT + BigInt(paddedFrac || "0");
  return (negative ? -drops : drops).toString();
}

// Convertit un montant "humain, echelle credit" (ex. le plafond recommande
// d'une evaluation de credit, deja en unites de l'actif — "5000" veut dire
// 5000 XRP ou 5000 RLUSD simule) en unite native ledger : drops pour XRP,
// valeur decimale inchangee pour un IOU (deja native, jamais mise a
// l'echelle). Distinct de ParsedLendingAsset.toLedgerAmount, qui suppose
// deja son entree en unite native (convention deposit/retrait existante) —
// ce garde-fou etait manquant et faisait passer un plafond RLUSD par une
// mise a l'echelle *1e6 propre a XRP uniquement.
export function toNativeAmount(assetId: string, humanAmount: string): string {
  const asset = parseLendingAssetId(assetId);
  return asset.ledgerAsset.currency === "XRP" ? humanXrpToDrops(humanAmount) : humanAmount;
}
