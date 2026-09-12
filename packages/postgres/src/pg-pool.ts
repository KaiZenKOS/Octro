import { Pool, type PoolConfig } from "pg";
import type { SqlClient, SqlPool } from "./sql.js";

export interface PgPoolHandle extends SqlPool {
  end(): Promise<void>;
}

/**
 * Production driver boundary. Callers keep credentials and TLS policy in
 * server-only configuration; repositories only receive the narrow SqlPool.
 */
export function createPgPool(config: PoolConfig): PgPoolHandle {
  const pool = new Pool(config);
  return {
    async connect(): Promise<SqlClient> {
      return await pool.connect() as unknown as SqlClient;
    },
    async end(): Promise<void> {
      await pool.end();
    },
  };
}
