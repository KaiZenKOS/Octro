import { buildDependencies } from "./composition.js";
import { buildServer } from "./server.js";

const app = buildServer(buildDependencies());
const port = Number(process.env["PORT"] ?? 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Octro API (in-memory data, Python optimizer) listening on :${port}`);
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
