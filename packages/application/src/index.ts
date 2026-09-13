// @octro/application — cas d'usage et ports. Depend du domaine ; les
// adaptateurs reels (PostgreSQL, XRPL, optimiseur Python) arrivent avec
// S3/S4/S5. adapters/in-memory est une doublure de developpement et de test,
// jamais une preuve d'integration (docs/TEAM_TASKS.md section 8).
export * from "./errors.js";

export * from "./ports/clock.js";
export * from "./ports/id-generator.js";
export * from "./ports/workspace-repository.js";
export * from "./ports/economic-event-repository.js";
export * from "./ports/network-capabilities-port.js";
export * from "./ports/optimizer-port.js";

export * from "./use-cases/create-workspace.js";
export * from "./use-cases/get-workspace.js";
export * from "./use-cases/record-declared-event.js";
export * from "./use-cases/get-personal-projection.js";
export * from "./use-cases/approve-financing-action.js";

export * from "./adapters/in-memory/system-clock.js";
export * from "./adapters/in-memory/uuid-id-generator.js";
export * from "./adapters/in-memory/in-memory-workspace-repository.js";
export * from "./adapters/in-memory/in-memory-economic-event-repository.js";
export * from "./adapters/in-memory/simulated-optimizer-adapter.js";
export * from "./adapters/in-memory/static-network-capabilities-adapter.js";

// Extension Lending/KYC/Credit — Phase A (comptes + verification email).
export * from "./ports/mail-port.js";
export * from "./ports/user-repository.js";
export * from "./ports/session-repository.js";
export * from "./ports/email-verification-repository.js";

export * from "./use-cases/sign-up.js";
export * from "./use-cases/confirm-email.js";
export * from "./use-cases/login.js";
export * from "./use-cases/validate-session.js";
export * from "./use-cases/get-current-user.js";

export * from "./adapters/in-memory/in-memory-user-repository.js";
export * from "./adapters/in-memory/in-memory-session-repository.js";
export * from "./adapters/in-memory/in-memory-email-verification-repository.js";
export * from "./adapters/in-memory/recording-mail-adapter.js";
export * from "./adapters/http/octro-mail-adapter.js";

// Extension Lending/KYC/Credit — Phase B (KYC simule).
export * from "./ports/kyc-status-repository.js";
export * from "./use-cases/simulate-kyc.js";
export * from "./use-cases/get-kyc-credential-status.js";
export * from "./use-cases/get-kyc-status.js";
export * from "./adapters/in-memory/in-memory-kyc-status-repository.js";

// Extension Lending/KYC/Credit — Phase C (persistance PostgreSQL reelle +
// chiffrement au repos). Les adaptateurs in-memory ci-dessus restent des
// doublures de test ; composition.ts bascule sur les adaptateurs Pg
// ci-dessous des que POSTGRES_ENABLED=true.
export * from "./ports/crypto-port.js";
export * from "./adapters/crypto/node-aes-gcm-adapter.js";
export * from "./adapters/pg/create-pg-pool.js";
export * from "./adapters/pg/pg-user-repository.js";
export * from "./adapters/pg/pg-session-repository.js";
export * from "./adapters/pg/pg-email-verification-repository.js";
export * from "./adapters/pg/pg-kyc-status-repository.js";

// Extension Lending/KYC/Credit — Phase D (scoring credit Odoo BYO).
export * from "./ports/odoo-port.js";
export * from "./ports/odoo-connection-repository.js";
export * from "./ports/credit-assessment-repository.js";
export * from "./use-cases/save-odoo-connection.js";
export * from "./use-cases/request-credit-assessment.js";
export * from "./use-cases/list-odoo-companies.js";
export * from "./use-cases/get-latest-credit-assessment.js";
export * from "./adapters/in-memory/in-memory-odoo-connection-repository.js";
export * from "./adapters/in-memory/in-memory-credit-assessment-repository.js";
export * from "./adapters/http/odoo-http-adapter.js";
export * from "./adapters/pg/pg-odoo-connection-repository.js";
export * from "./adapters/pg/pg-credit-assessment-repository.js";

// Extension Lending/KYC/Credit — Phase E (wallet + vault/broker partages).
export * from "./xrpl-support.js";
export * from "./ports/wallet-repository.js";
export * from "./ports/lending-pool-repository.js";
export * from "./ports/lender-deposit-repository.js";
export * from "./ports/loan-position-repository.js";
export * from "./use-cases/provision-wallet.js";
export * from "./use-cases/bootstrap-lending-pool.js";
export * from "./use-cases/lender-deposit.js";
export * from "./use-cases/borrower-loan-request.js";
export * from "./use-cases/repay-loan.js";
export * from "./adapters/in-memory/in-memory-wallet-repository.js";
export * from "./adapters/in-memory/in-memory-lending-pool-repository.js";
export * from "./adapters/in-memory/in-memory-lender-deposit-repository.js";
export * from "./adapters/in-memory/in-memory-loan-position-repository.js";
export * from "./adapters/pg/pg-wallet-repository.js";
export * from "./adapters/pg/pg-lending-pool-repository.js";
export * from "./adapters/pg/pg-lender-deposit-repository.js";
export * from "./adapters/pg/pg-loan-position-repository.js";
export * from "./adapters/in-memory/fake-lending-v1-adapter.js";

// Extension Lending/KYC/Credit — Phase F (avance de liquidite buffer).
export * from "./ports/withdrawal-request-repository.js";
export * from "./ports/buffer-ledger-repository.js";
export * from "./use-cases/withdraw-from-vault.js";
export * from "./adapters/in-memory/in-memory-withdrawal-request-repository.js";
export * from "./adapters/in-memory/in-memory-buffer-ledger-repository.js";
export * from "./adapters/in-memory/fake-buffer-disbursement-adapter.js";
export * from "./adapters/pg/pg-withdrawal-request-repository.js";
export * from "./adapters/pg/pg-buffer-ledger-repository.js";

// Integration xrpl-lending-sim — actifs multiples (XRP + RLUSD simule, IOU)
// et journal d'audit brut des transactions dans MongoDB (donnees non
// financieres/non decisionnelles, voir .env.example : "optional raw
// documents only; no financial balances or access decisions").
export * from "./decimal-support.js";
export * from "./lending-asset.js";
export * from "./ports/tx-evidence-repository.js";
export * from "./use-cases/list-lending-assets.js";
export * from "./use-cases/get-lending-positions.js";
export * from "./use-cases/get-wallet.js";
export * from "./use-cases/get-wallet-activity.js";
export * from "./use-cases/get-loan-outstanding.js";
export * from "./adapters/in-memory/fake-loan-query-adapter.js";
export * from "./adapters/in-memory/fake-credentials-and-domains-adapter.js";
export * from "./adapters/in-memory/fake-account-activity-adapter.js";
export * from "./adapters/in-memory/fake-iou-setup-adapter.js";
export * from "./trustline-support.js";
export * from "./adapters/in-memory/in-memory-tx-evidence-repository.js";
export * from "./adapters/mongo/create-mongo-client.js";
export * from "./adapters/mongo/mongo-tx-evidence-repository.js";
