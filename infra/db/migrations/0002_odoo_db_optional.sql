-- Odoo JSON-2 can select the sole database without X-Odoo-Database.
-- Keeping this nullable avoids asking users to guess an internal database
-- name while preserving explicit selection for multi-database deployments.
ALTER TABLE odoo_connections ALTER COLUMN odoo_db DROP NOT NULL;
