// Extension Lending/KYC/Credit — Phase F. Garde defensive : le use-case
// calcule deja `avance = min(demande, solde_buffer)` (logique metier
// "plafonner, pas rejeter", cf. decision actee) ; cette assertion protege
// uniquement contre un bug qui produirait une avance depassant le solde
// reel du buffer.
//
// Integration xrpl-lending-sim : montants en chaine decimale (drops XRP
// entiers, ou valeur decimale d'un IOU comme RLUSD simule) — jamais un
// flottant. Comparaison en virgule fixe auto-contenue (le domaine ne peut
// pas dependre de packages/application/src/decimal-support.ts).
export class BufferOverdraftError extends Error {
  constructor(message = "buffer advance would exceed the current buffer balance") {
    super(message);
    this.name = "BufferOverdraftError";
  }
}

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

export function assertAdvanceWithinBalance(advanceAmount: string, bufferBalance: string): void {
  if (toFixedPoint(advanceAmount) > toFixedPoint(bufferBalance)) {
    throw new BufferOverdraftError();
  }
}
