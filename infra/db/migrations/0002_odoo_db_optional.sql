-- Correctif : un Odoo on-premise mono-base (cas BYO vise) n'a pas besoin
-- d'un nom de base — l'exiger faisait echouer la connexion en 404 des que
-- l'utilisateur devinait un nom errone (X-Odoo-Database omis fonctionne).
ALTER TABLE odoo_connections ALTER COLUMN odoo_db DROP NOT NULL;
