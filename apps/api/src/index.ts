import { validateBackendEnvironment } from "../../../infra/config/environment.mjs";
import { buildDependencies } from "./composition.js";
import { buildServer } from "./server.js";

const port = Number(process.env["PORT"] ?? 3000);

async function start(): Promise<void> {
  const environment = validateBackendEnvironment(process.env);
  if (!environment.valid) {
    const details = environment.issues.map(({ variable, message }) => `${variable}: ${message}`).join("; ");
    throw new Error(`OPS-02: startup refused because backend configuration is invalid (${details})`);
  }

  const dependencies = buildDependencies();
  let app: ReturnType<typeof buildServer> | undefined;
  try {
    await dependencies.checkReadiness();
    app = buildServer(dependencies);
    await app.listen({ port, host: "0.0.0.0" });
    // eslint-disable-next-line no-console
    console.log(`Octro API (PostgreSQL, Python optimizer) listening on :${port}`);
  } catch (error) {
    if (app) await app.close().catch(() => undefined);
    await dependencies.close().catch(() => undefined);
    const message = error instanceof Error && /^(OPS-02|SEC-01|DATA-03):/.test(error.message)
      ? error.message
      : "OPS-02: PostgreSQL readiness check failed; verify connection, schema, role and TLS configuration";
    throw new Error(message);
  }
}

start().catch((error: unknown) => {
  // All expected startup errors are sanitized and contain no environment values.
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : "Octro API startup failed");
  process.exitCode = 1;
});
