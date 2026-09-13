// Arithmetique decimale exacte (18 decimales, meme precision que
// DecimalStringSchema/Money — packages/contracts/src/primitives.ts) sur des
// chaines, jamais un flottant JS. Integration xrpl-lending-sim : le solde
// retirable d'un lender et le grand livre du buffer doivent fonctionner
// identiquement pour un Vault XRP (drops, entiers) et un Vault IOU (RLUSD
// simule, decimales).
const SCALE = 18;
const SCALE_FACTOR = 10n ** BigInt(SCALE);

function toFixedPoint(value: string): bigint {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const paddedFrac = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const magnitude = BigInt(intPart || "0") * SCALE_FACTOR + BigInt(paddedFrac || "0");
  return negative ? -magnitude : magnitude;
}

function fromFixedPoint(value: bigint): string {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const intPart = magnitude / SCALE_FACTOR;
  const fracDigits = (magnitude % SCALE_FACTOR).toString().padStart(SCALE, "0").replace(/0+$/, "");
  const text = fracDigits ? `${intPart}.${fracDigits}` : `${intPart}`;
  return negative && magnitude !== 0n ? `-${text}` : text;
}

export function addDecimal(a: string, b: string): string {
  return fromFixedPoint(toFixedPoint(a) + toFixedPoint(b));
}

export function subtractDecimal(a: string, b: string): string {
  return fromFixedPoint(toFixedPoint(a) - toFixedPoint(b));
}

export function minDecimal(a: string, b: string): string {
  return toFixedPoint(a) <= toFixedPoint(b) ? a : b;
}

export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const diff = toFixedPoint(a) - toFixedPoint(b);
  return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}

export function isPositiveDecimal(value: string): boolean {
  return toFixedPoint(value) > 0n;
}
