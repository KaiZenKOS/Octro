-- Phase C — premiere persistance PostgreSQL reelle du projet (S1 etait
-- entierement en memoire). Couvre le schema complet des Phases A a F ; les
-- adaptateurs Pg correspondants arrivent phase par phase (voir le plan),
-- mais le schema est cree une seule fois ici pour eviter des migrations
-- fragmentees en pleine periode de hackathon.
--
-- Convention : les identifiants sont des uuid generes cote application
-- (IdGenerator, node:crypto randomUUID), jamais cote SQL. Les montants XRPL
-- sont des drops (bigint, jamais un flottant) ; le pg driver Node renvoie un
-- bigint Postgres comme string JS, evitant toute perte de precision.

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Phase A — comptes + verification email.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS email_verifications_user_purpose_idx
  ON email_verifications(user_id, purpose);

-- Phase B — KYC simule.
CREATE TABLE IF NOT EXISTS kyc_statuses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  status text NOT NULL,
  decided_at timestamptz,
  simulated boolean NOT NULL DEFAULT true
);

-- Phase E — wallet XRPL provisionne a l'inscription (seed chiffree, jamais
-- en clair ; voir packages/application/src/adapters/crypto).
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  address text NOT NULL UNIQUE,
  seed_ciphertext text NOT NULL,
  network text NOT NULL DEFAULT 'custom-hackathon-devnet',
  created_at timestamptz NOT NULL
);

-- Phase D — connexion Odoo BYO (une par utilisateur, cle API chiffree).
CREATE TABLE IF NOT EXISTS odoo_connections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  odoo_url text NOT NULL,
  odoo_db text NOT NULL,
  api_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL,
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS odoo_connections_user_idx ON odoo_connections(user_id);

-- Le score est calcule sur les livres de l'entreprise (devise Odoo native,
-- ex. fiat:EUR) : recommended_credit_line reste dans cette devise (DATA-03,
-- montant decimal + actif identifie, jamais un flottant). La conversion en
-- drops XRP est une decision de la Phase E (demande de pret), pas de ce
-- calcul de score.
CREATE TABLE IF NOT EXISTS credit_assessments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  odoo_connection_id uuid NOT NULL REFERENCES odoo_connections(id),
  generated_at timestamptz NOT NULL,
  composite_score double precision NOT NULL,
  grade text NOT NULL,
  decision text NOT NULL,
  recommended_credit_line_amount_decimal text NOT NULL,
  recommended_credit_line_asset_id text NOT NULL,
  term_months integer NOT NULL,
  indicative_annual_rate_pct double precision NOT NULL,
  details jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS credit_assessments_user_idx ON credit_assessments(user_id, generated_at DESC);

-- Phase E — vault/broker XRPL partages (une seule ligne, cree une fois par
-- BootstrapLendingPoolUseCase) et positions lender/borrower.
CREATE TABLE IF NOT EXISTS lending_pool (
  id uuid PRIMARY KEY,
  vault_id text NOT NULL,
  loan_broker_id text NOT NULL,
  owner_address text NOT NULL,
  owner_seed_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS lender_deposits (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  vault_id text NOT NULL,
  amount_drops bigint NOT NULL,
  status text NOT NULL,
  tx_evidence jsonb,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lender_deposits_user_idx ON lender_deposits(user_id);

CREATE TABLE IF NOT EXISTS loan_positions (
  id uuid PRIMARY KEY,
  borrower_user_id uuid NOT NULL REFERENCES users(id),
  credit_assessment_id uuid NOT NULL REFERENCES credit_assessments(id),
  loan_broker_id text NOT NULL,
  loan_id text NOT NULL,
  principal_drops bigint NOT NULL,
  interest_rate integer NOT NULL,
  payment_interval_seconds integer NOT NULL,
  payment_total integer NOT NULL,
  grace_period_seconds integer NOT NULL,
  status text NOT NULL,
  tx_evidence jsonb,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS loan_positions_borrower_idx ON loan_positions(borrower_user_id);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY,
  lender_user_id uuid NOT NULL REFERENCES users(id),
  vault_id text NOT NULL,
  requested_amount_drops bigint NOT NULL,
  fulfilled_amount_drops bigint NOT NULL DEFAULT 0,
  funded_from text NOT NULL,
  status text NOT NULL,
  evidence jsonb,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS withdrawal_requests_lender_idx ON withdrawal_requests(lender_user_id);

-- Phase F — grand livre du buffer de liquidite (avances de retrait).
CREATE TABLE IF NOT EXISTS buffer_ledger (
  id uuid PRIMARY KEY,
  withdrawal_request_id uuid REFERENCES withdrawal_requests(id),
  entry_type text NOT NULL,
  amount_drops bigint NOT NULL,
  balance_after_drops bigint NOT NULL,
  tx_evidence jsonb,
  created_at timestamptz NOT NULL
);
