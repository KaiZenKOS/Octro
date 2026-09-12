import type { OdooConnection, OdooConnectionProvider } from "@octro/contracts";

// Forme de persistance (jamais exposee telle quelle) : la cle API n'est
// jamais stockee en clair (apiKeyCiphertext, voir adapters/crypto), et le
// contrat public @octro/contracts `OdooConnection` l'omet deliberement.
export interface OdooConnectionRecord {
  id: string;
  userId: string;
  provider: OdooConnectionProvider;
  odooUrl: string;
  odooDb: string;
  apiKeyCiphertext: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface OdooConnectionRepository {
  save(connection: OdooConnectionRecord): Promise<void>;
  findById(id: string): Promise<OdooConnectionRecord | null>;
  findByUserId(userId: string): Promise<OdooConnectionRecord[]>;
}

export function toOdooConnectionDTO(record: OdooConnectionRecord): OdooConnection {
  return {
    id: record.id,
    user_id: record.userId,
    provider: record.provider,
    odoo_url: record.odooUrl,
    odoo_db: record.odooDb,
    created_at: record.createdAt.toISOString(),
    last_used_at: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
  };
}
