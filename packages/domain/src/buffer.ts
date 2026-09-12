// Extension Lending/KYC/Credit — Phase F. Garde defensive : le use-case
// calcule deja `avance = min(demande, solde_buffer)` (logique metier
// "plafonner, pas rejeter", cf. decision actee) ; cette assertion protege
// uniquement contre un bug qui produirait une avance depassant le solde
// reel du buffer.
export class BufferOverdraftError extends Error {
  constructor(message = "buffer advance would exceed the current buffer balance") {
    super(message);
    this.name = "BufferOverdraftError";
  }
}

export function assertAdvanceWithinBalance(advanceAmountDrops: bigint, bufferBalanceDrops: bigint): void {
  if (advanceAmountDrops > bufferBalanceDrops) {
    throw new BufferOverdraftError();
  }
}
