import { validateBackendEnvironment } from "../infra/config/environment.mjs";

const report = validateBackendEnvironment(process.env);
console.log(JSON.stringify({
  ...report,
  scope: "configuration syntax only; no connection, authentication or application integration tested",
}, null, 2));
process.exitCode = report.valid ? 0 : 1;
