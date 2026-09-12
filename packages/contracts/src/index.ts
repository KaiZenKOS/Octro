// @octro/contracts — les neuf contrats C1 de docs/TEAM_TASKS.md section 3
// (Workspace, EconomicEvent, Projection, ActionPlan, Approval, Execution,
// EligibilityDecision, NetworkCapabilities, Error) plus les primitives
// partagees. Distinct des modeles de persistance et des payloads XRPL natifs
// (docs/architecture.md).
export * from "./primitives.js";
export * from "./workspace.js";
export * from "./economic-event.js";
export * from "./projection.js";
export * from "./projection-result.js";
export * from "./optimizer-result.js";
export * from "./action-plan.js";
export * from "./approval.js";
export * from "./execution.js";
export * from "./eligibility-decision.js";
export * from "./network-capabilities.js";
export * from "./errors.js";

// Extension Lending/KYC/Credit (hors du pack C1 ci-dessus, ajoutee pour le
// parcours compte -> KYC simule -> credit Odoo -> lending V1 partage ->
// buffer de liquidite). Voir docs/adr pour les ecarts documentes (WAL-01,
// PER-11, CMP-01, SEC-04/SEC-LOAD-01).
export * from "./user.js";
export * from "./email-verification.js";
export * from "./kyc-status.js";
export * from "./odoo-connection.js";
export * from "./credit-assessment.js";
export * from "./wallet.js";
export * from "./lending.js";
