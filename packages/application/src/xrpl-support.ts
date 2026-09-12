import type { PortResult, TransactionEvidence } from "@octro/xrpl";
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
