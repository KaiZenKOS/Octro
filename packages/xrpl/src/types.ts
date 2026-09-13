/**
 * Shared types for the packages/xrpl/ adapters (Augustin).
 *
 * Adapter status values follow chapter 32 of the CDC exactly:
 * only "ready" allows a transaction to be prepared, and every other
 * value must carry timestamped evidence rather than a guess.
 */

export type AdapterStatus = "unavailable" | "unsupported" | "ready" | "degraded";

export interface NetworkCapabilitySnapshot {
  observed_at_utc: string;
  network: string;
  rpc_url: string;
  wss_url: string;
  network_id: number | null;
  build_version: string | null;
  validated_ledger_seq: number | null;
  validated_ledger_hash: string | null;
  enabled_amendments: string[];
  sdk_package: "xrpl";
  sdk_version: string | null;
  status: AdapterStatus;
}

/** TransactionEvidence, chapter 32 — a missing proof stays missing. */
export interface TransactionEvidence {
  scenario_id: string;
  step_id: string;
  tx_type: string;
  tx_hash?: string; // absent for a pre-inclusion rejection
  submit_preliminary_result?: string;
  result_code: string | null;
  validated: boolean;
  ledger_index: number | null;
  explorer_url?: string;
  redacted_request_ref?: string;
  commit?: string;
}

/**
 * Every port method returns one of these three shapes explicitly: a
 * transaction never becomes "success" by falling through an error path
 * (chapter 32: "Le frontend ne transforme aucun de ces états en succès
 * optimiste.").
 */
export type PortResult<T> =
  | { outcome: "ready"; data: T; evidence: TransactionEvidence }
  | { outcome: "rejected"; evidence: TransactionEvidence }
  | { outcome: "unavailable" | "unsupported" | "degraded"; reason: string };
