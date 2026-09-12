-- Migration 0003 : Workspaces et Economic Events pour persistance PostgreSQL reelle (PER-03, DATA-01, DATA-02, DATA-03, SEC-01).

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
  owner_user_id uuid NOT NULL,
  organization_id uuid,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT personal_no_org CHECK (
    (kind = 'personal' AND organization_id IS NULL) OR
    (kind = 'organization' AND organization_id IS NOT NULL)
  ),
  CONSTRAINT tenant_id_equals_id CHECK (tenant_id = id)
);

CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_user_id);

CREATE TABLE IF NOT EXISTS economic_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(id),
  source_event_id text NOT NULL,
  connection_ref text,
  direction text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  amount_decimal text NOT NULL,
  asset_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('expected', 'settled', 'cancelled')),
  verification text NOT NULL CHECK (verification IN ('declared', 'imported', 'provider_verified', 'ledger_verified')),
  label text NOT NULL,
  occurred_at timestamptz,
  observed_at timestamptz NOT NULL,
  expected_settlement_at timestamptz,
  raw_object_ref text,
  CONSTRAINT unique_tenant_source UNIQUE (tenant_id, source_event_id)
);

CREATE INDEX IF NOT EXISTS economic_events_tenant_settlement_idx 
  ON economic_events(tenant_id, expected_settlement_at);
