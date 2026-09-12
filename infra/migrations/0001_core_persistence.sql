-- Octro v2.2 persistence baseline.
-- Traceability: DATA-01/02/03, SEC-01/02, OPS-01/03, PER-03/11.
-- Chapter 22 requires business writes and outbox rows to commit atomically.
-- All business rows are Workspace-scoped; set octro.workspace_id per tx.

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
  owner_user_id uuid NOT NULL,
  organization_id uuid,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL,
  CONSTRAINT workspace_tenant_is_id CHECK (tenant_id = id),
  CONSTRAINT workspace_kind_organization_check CHECK (
    (kind = 'personal' AND organization_id IS NULL) OR
    (kind = 'organization' AND organization_id IS NOT NULL)
  ),
  CONSTRAINT workspace_tenant_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS economic_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  connection_ref text,
  source_event_id text NOT NULL CHECK (length(source_event_id) > 0),
  direction text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  amount_decimal numeric(38,18) NOT NULL,
  asset_id text NOT NULL CHECK (length(asset_id) > 0),
  status text NOT NULL CHECK (status IN ('expected', 'settled', 'cancelled')),
  verification text NOT NULL CHECK (verification IN ('declared', 'imported', 'provider_verified', 'ledger_verified')),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  occurred_at timestamptz,
  observed_at timestamptz NOT NULL,
  expected_settlement_at timestamptz,
  raw_object_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT economic_event_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT economic_event_nonnegative_amount CHECK (amount_decimal >= 0)
);

-- The two indexes match the optional connection_ref semantics in DATA-01.
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_source_without_connection
  ON economic_events (tenant_id, source_event_id) WHERE connection_ref IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_source_with_connection
  ON economic_events (tenant_id, connection_ref, source_event_id) WHERE connection_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS forecast_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  generated_at timestamptz NOT NULL,
  as_of timestamptz NOT NULL,
  horizon_steps integer NOT NULL CHECK (horizon_steps BETWEEN 1 AND 366),
  horizon_unit text NOT NULL CHECK (horizon_unit IN ('day', 'hour')),
  data_quality text NOT NULL CHECK (data_quality IN ('declared', 'imported', 'provider_verified', 'ledger_verified', 'mixed')),
  request_json jsonb NOT NULL,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forecast_run_tenant_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS forecast_points (
  tenant_id uuid NOT NULL,
  forecast_run_id uuid NOT NULL,
  step integer NOT NULL CHECK (step >= 0),
  asset_id text NOT NULL,
  expected_balance numeric(38,18) NOT NULL,
  confirmed_balance numeric(38,18) NOT NULL,
  PRIMARY KEY (tenant_id, forecast_run_id, step, asset_id),
  FOREIGN KEY (tenant_id, forecast_run_id) REFERENCES forecast_runs(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  version integer NOT NULL CHECK (version >= 1),
  status text NOT NULL CHECK (status IN ('DRAFT', 'PROPOSED', 'ACKNOWLEDGED', 'DISMISSED', 'EXPIRED')),
  plan_hash text NOT NULL CHECK (plan_hash ~ '^[0-9a-f]{64}$'),
  plan_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz,
  CONSTRAINT plan_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT plan_tenant_hash_unique UNIQUE (tenant_id, plan_hash)
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  plan_id uuid NOT NULL,
  plan_version integer NOT NULL CHECK (plan_version >= 1),
  terms_hash text NOT NULL CHECK (terms_hash ~ '^[0-9a-f]{64}$'),
  approver_user_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT approval_plan_fk FOREIGN KEY (tenant_id, plan_id) REFERENCES plans(tenant_id, id),
  CONSTRAINT approval_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT approval_plan_link_unique UNIQUE (tenant_id, plan_id, id)
);

CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  plan_id uuid NOT NULL,
  approval_id uuid,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) > 0),
  kind text NOT NULL CHECK (kind IN ('simulated', 'instruction', 'real')),
  outcome text NOT NULL CHECK (outcome IN ('pending', 'confirmed', 'outcome_unknown', 'failed')),
  occurred_at timestamptz NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_refs) = 'array'),
  ledger_tx_hash text,
  CONSTRAINT execution_plan_fk FOREIGN KEY (tenant_id, plan_id) REFERENCES plans(tenant_id, id),
  CONSTRAINT execution_approval_fk FOREIGN KEY (tenant_id, plan_id, approval_id)
    REFERENCES approvals(tenant_id, plan_id, id),
  CONSTRAINT execution_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT execution_plan_link_unique UNIQUE (tenant_id, plan_id, id),
  CONSTRAINT execution_idempotency_unique UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  occurred_at timestamptz NOT NULL,
  actor_user_id uuid,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 160),
  plan_id uuid,
  approval_id uuid,
  execution_id uuid,
  plan_hash text CHECK (plan_hash IS NULL OR plan_hash ~ '^[0-9a-f]{64}$'),
  ledger_tx_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_plan_fk FOREIGN KEY (tenant_id, plan_id) REFERENCES plans(tenant_id, id),
  CONSTRAINT audit_approval_link_fk FOREIGN KEY (tenant_id, plan_id, approval_id)
    REFERENCES approvals(tenant_id, plan_id, id),
  CONSTRAINT audit_execution_link_fk FOREIGN KEY (tenant_id, plan_id, execution_id)
    REFERENCES executions(tenant_id, plan_id, id),
  CONSTRAINT audit_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT audit_ledger_hash_requires_execution CHECK (ledger_tx_hash IS NULL OR execution_id IS NOT NULL)
);

-- A ledger transaction hash can be absent (e.g. rejection before inclusion).
-- Never synthesize one merely to fill the audit correlation.
CREATE INDEX IF NOT EXISTS audit_events_tenant_plan_created
  ON audit_events (tenant_id, plan_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 160),
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lock_token uuid,
  locked_until timestamptz,
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  last_error_code text,
  CONSTRAINT outbox_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT outbox_lease_pair_check CHECK ((lock_token IS NULL) = (locked_until IS NULL)),
  CONSTRAINT outbox_terminal_state_check CHECK (NOT (delivered_at IS NOT NULL AND dead_lettered_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS outbox_ready_by_tenant
  ON outbox_events (tenant_id, available_at, created_at)
  WHERE delivered_at IS NULL AND dead_lettered_at IS NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  tenant_id uuid NOT NULL REFERENCES workspaces(tenant_id),
  route_key text NOT NULL CHECK (length(route_key) BETWEEN 1 AND 200),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('processing', 'completed')),
  response_status integer,
  response_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, route_key, idempotency_key),
  CONSTRAINT idempotency_completed_fields CHECK (
    (status = 'processing' AND response_status IS NULL AND response_json IS NULL AND completed_at IS NULL) OR
    (status = 'completed' AND response_status BETWEEN 100 AND 599 AND response_json IS NOT NULL AND completed_at IS NOT NULL)
  )
);

-- Audit is append-only even for the owner connection; corrections are new events.
CREATE OR REPLACE FUNCTION octro_reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only; write a compensating event';
END;
$$;
DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION octro_reject_audit_mutation();

-- Row-level security is a defense in depth; service authorization is still required.
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'workspaces', 'economic_events', 'forecast_runs', 'forecast_points', 'plans',
    'approvals', 'executions', 'audit_events', 'outbox_events', 'idempotency_keys'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON %I', relation_name);
    EXECUTE format(
      'CREATE POLICY workspace_isolation ON %I USING (tenant_id = nullif(current_setting(''octro.workspace_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''octro.workspace_id'', true), '''')::uuid)',
      relation_name
    );
  END LOOP;
END;
$$;
