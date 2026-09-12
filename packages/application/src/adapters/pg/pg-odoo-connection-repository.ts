import type { OdooConnectionProvider } from "@octro/contracts";
import type { Pool } from "pg";
import type { OdooConnectionRecord, OdooConnectionRepository } from "../../ports/odoo-connection-repository.js";

interface OdooConnectionRow {
  id: string;
  user_id: string;
  odoo_url: string;
  odoo_db: string;
  api_key_ciphertext: string;
  created_at: Date;
  last_used_at: Date | null;
}

function toRecord(row: OdooConnectionRow): OdooConnectionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: "odoo" as OdooConnectionProvider,
    odooUrl: row.odoo_url,
    odooDb: row.odoo_db,
    apiKeyCiphertext: row.api_key_ciphertext,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export class PgOdooConnectionRepository implements OdooConnectionRepository {
  constructor(private readonly pool: Pool) {}

  async save(connection: OdooConnectionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO odoo_connections (id, user_id, odoo_url, odoo_db, api_key_ciphertext, created_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET last_used_at = EXCLUDED.last_used_at`,
      [
        connection.id,
        connection.userId,
        connection.odooUrl,
        connection.odooDb,
        connection.apiKeyCiphertext,
        connection.createdAt,
        connection.lastUsedAt,
      ],
    );
  }

  async findById(id: string): Promise<OdooConnectionRecord | null> {
    const { rows } = await this.pool.query<OdooConnectionRow>("SELECT * FROM odoo_connections WHERE id = $1", [id]);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<OdooConnectionRecord[]> {
    const { rows } = await this.pool.query<OdooConnectionRow>(
      "SELECT * FROM odoo_connections WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toRecord);
  }
}
