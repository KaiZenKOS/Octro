-- SEC-01 / DATA-01 / DATA-02 / DATA-03 / PER-03 / OPS-02.
-- Reconcile the early Workspace/event schema with the v2.2 contract.
-- This is intentionally additive/idempotent: some environments already
-- applied the earlier 0003_workspaces_events.sql migration.

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
  owner_user_id uuid NOT NULL,
  organization_id uuid,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT workspace_v22_tenant_is_id CHECK (tenant_id = id),
  CONSTRAINT workspace_v22_kind_organization_check CHECK (
    (kind = 'personal' AND organization_id IS NULL) OR
    (kind = 'organization' AND organization_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS economic_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  connection_ref text,
  source_event_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  amount_decimal numeric(38,18) NOT NULL,
  asset_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('expected', 'settled', 'cancelled')),
  verification text NOT NULL CHECK (verification IN ('declared', 'imported', 'provider_verified', 'ledger_verified')),
  label text NOT NULL,
  occurred_at timestamptz,
  observed_at timestamptz NOT NULL,
  expected_settlement_at timestamptz,
  raw_object_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reject malformed or over-precision text before casting. A failed migration
-- rolls back as one transaction and leaves the existing rows untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM economic_events
    WHERE amount_decimal::text !~ '^-?(0|[1-9][0-9]*)([.][0-9]{1,18})?$'
       OR length(split_part(ltrim(amount_decimal::text, '-'), '.', 1)) > 20
  ) THEN
    RAISE EXCEPTION 'DATA-03: existing economic event amount is not an exact NUMERIC(38,18) decimal';
  END IF;
END;
$$;

ALTER TABLE economic_events
  ALTER COLUMN amount_decimal TYPE numeric(38,18)
  USING amount_decimal::numeric(38,18);
ALTER TABLE economic_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE economic_events
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'workspaces'::regclass AND conname = 'workspaces_v22_tenant_id_unique'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_v22_tenant_id_unique UNIQUE (tenant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'workspaces'::regclass AND conname = 'workspaces_v22_display_name_check'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_v22_display_name_check
      CHECK (length(display_name) BETWEEN 1 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_tenant_fk'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES workspaces(tenant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_source_id_check'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_source_id_check
      CHECK (length(source_event_id) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_connection_ref_check'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_connection_ref_check
      CHECK (connection_ref IS NULL OR length(connection_ref) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_asset_id_check'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_asset_id_check
      CHECK (length(asset_id) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_label_check'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_label_check
      CHECK (length(label) BETWEEN 1 AND 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'economic_events'::regclass AND conname = 'economic_events_v22_nonnegative_amount_check'
  ) THEN
    ALTER TABLE economic_events ADD CONSTRAINT economic_events_v22_nonnegative_amount_check
      CHECK (amount_decimal >= 0);
  END IF;
END;
$$;

ALTER TABLE economic_events DROP CONSTRAINT IF EXISTS economic_events_tenant_id_fkey;

-- Replace the early over-restrictive (tenant, source) uniqueness with the
-- contract's exact key: no connection uses tenant+source; connected data
-- uses tenant+connection+source.
ALTER TABLE economic_events DROP CONSTRAINT IF EXISTS unique_tenant_source;
DROP INDEX IF EXISTS unique_tenant_source;
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_source_without_connection
  ON economic_events (tenant_id, source_event_id) WHERE connection_ref IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_source_with_connection
  ON economic_events (tenant_id, connection_ref, source_event_id) WHERE connection_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces (owner_user_id);
CREATE INDEX IF NOT EXISTS economic_events_tenant_settlement_idx
  ON economic_events (tenant_id, expected_settlement_at);

-- A missing/invalid transaction-local tenant is NULL or fails closed. The
-- repositories still add explicit tenant predicates and ownership checks.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation ON workspaces;
CREATE POLICY workspace_isolation ON workspaces
  USING (tenant_id = nullif(current_setting('octro.workspace_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('octro.workspace_id', true), '')::uuid);

ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation ON economic_events;
CREATE POLICY workspace_isolation ON economic_events
  USING (tenant_id = nullif(current_setting('octro.workspace_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('octro.workspace_id', true), '')::uuid);
