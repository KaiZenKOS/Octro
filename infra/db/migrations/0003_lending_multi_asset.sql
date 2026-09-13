-- Integration xrpl-lending-sim : plusieurs actifs (XRP natif + RLUSD simule,
-- IOU) peuvent desormais avoir leur propre vault/broker/pool partage. Les
-- montants passent de bigint (drops uniquement) a text, pour supporter les
-- valeurs decimales d'un IOU sans perte de precision (DATA-03).
-- asset_id suit la convention @octro/contracts (namespace:code[:issuer]) :
-- "xrpl:XRP" pour le natif, "xrpl:RLUSD:<issuer>" pour l'IOU simule.
-- Le defaut 'xrpl:XRP' preserve les lignes deja amorcees en reel.

ALTER TABLE lending_pool ADD COLUMN IF NOT EXISTS asset_id text NOT NULL DEFAULT 'xrpl:XRP';
ALTER TABLE lending_pool ADD CONSTRAINT lending_pool_asset_id_unique UNIQUE (asset_id);

ALTER TABLE lender_deposits ADD COLUMN IF NOT EXISTS asset_id text NOT NULL DEFAULT 'xrpl:XRP';
ALTER TABLE lender_deposits ALTER COLUMN amount_drops TYPE text USING amount_drops::text;

ALTER TABLE loan_positions ADD COLUMN IF NOT EXISTS asset_id text NOT NULL DEFAULT 'xrpl:XRP';
ALTER TABLE loan_positions ALTER COLUMN principal_drops TYPE text USING principal_drops::text;

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS asset_id text NOT NULL DEFAULT 'xrpl:XRP';
ALTER TABLE withdrawal_requests ALTER COLUMN requested_amount_drops TYPE text USING requested_amount_drops::text;
ALTER TABLE withdrawal_requests ALTER COLUMN fulfilled_amount_drops TYPE text USING fulfilled_amount_drops::text;
ALTER TABLE withdrawal_requests ALTER COLUMN fulfilled_amount_drops SET DEFAULT '0';

ALTER TABLE buffer_ledger ADD COLUMN IF NOT EXISTS asset_id text NOT NULL DEFAULT 'xrpl:XRP';
ALTER TABLE buffer_ledger ALTER COLUMN amount_drops TYPE text USING amount_drops::text;
ALTER TABLE buffer_ledger ALTER COLUMN balance_after_drops TYPE text USING balance_after_drops::text;
