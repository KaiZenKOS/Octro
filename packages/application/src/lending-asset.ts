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
