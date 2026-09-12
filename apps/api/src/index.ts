import { buildDependencies } from "./composition.js";
import { buildServer } from "./server.js";

if (process.env["NODE_ENV"] !== "test" && process.env["SKIP_CONFIG_CHECK"] !== "true") {
  const envValidatorUrl = new URL("../../../infra/config/environment.mjs", import.meta.url).href;
  const { validateBackendEnvironment } = (await import(envValidatorUrl)) as {
    validateBackendEnvironment: (env: NodeJS.ProcessEnv) => {
      valid: boolean;
      issues: Array<{ variable: string; message: string }>;
    };
  };
  const report = validateBackendEnvironment(process.env);
  if (!report.valid) {
    // eslint-disable-next-line no-console
    console.error("Backend environment validation failed (SEC-04, OPS-02):");
    for (const issue of report.issues) {
      // eslint-disable-next-line no-console
      console.error(`- ${issue.variable}: ${issue.message}`);
    }
    process.exit(1);
  }
}

const app = buildServer(buildDependencies());
const port = Number(process.env["PORT"] ?? 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Octro API listening on :${port}`);
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

