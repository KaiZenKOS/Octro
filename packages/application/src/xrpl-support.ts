import type { PortResult, QueryResult, TransactionEvidence } from "@octro/xrpl";
import { LendingOperationFailedError } from "./errors.js";

// Un PortResult XRPL non-"ready" ne devient jamais un succes silencieux : ce
// garde leve LendingOperationFailedError (jamais une exception generique),
// que la route http-errors.ts sait mapper explicitement. Sur succes, renvoie
// a la fois la donnee et l'evidence (jamais l'une sans l'autre — chapitre 32).
export function assertReady<T>(result: PortResult<T>): { data: T; evidence: TransactionEvidence } {
  if (result.outcome === "ready") return { data: result.data, evidence: result.evidence };
  if (result.outcome === "rejected") {
    throw new LendingOperationFailedError("rejected", result.evidence as unknown as Record<string, unknown>);
  }
  throw new LendingOperationFailedError(result.outcome, result.reason);
}

// Meme principe pour QueryResult (lecture seule, ex. AccountActivityPort/
// LoanQueryPort) : un echec de lecture leve LendingOperationFailedError
// plutot qu'une exception generique, mappee par http-errors.ts comme le
// reste des echecs XRPL. A n'utiliser que lorsque degrader silencieusement
// (tableau vide, comme GetWalletActivityUseCase) n'a pas de sens — ex. un
// montant a rembourser inconnu ne peut pas degrader vers "0".
export function assertQueryReady<T>(result: QueryResult<T>): T {
  if (result.outcome === "ready") return result.data;
  throw new LendingOperationFailedError(result.outcome, result.reason);
}
