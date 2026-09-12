export interface SqlResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

export interface SqlClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<SqlResult<Row>>;
  release?(): void;
}

export interface SqlPool {
  connect(): Promise<SqlClient>;
}

export async function inWorkspaceTransaction<T>(
  pool: SqlPool,
  tenantId: string,
  run: (client: SqlClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query("BEGIN");
    begun = true;
    // Use set_config instead of interpolating a tenant value into SET syntax.
    await client.query("SELECT set_config('octro.workspace_id', $1, true)", [tenantId]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (begun) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure. The pool should discard a broken connection.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}
