import { spawnSync } from "node:child_process";

const python = process.env.OCTRO_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const result = spawnSync(python, ["-m", "unittest", "discover", "-s", "tests", "-v"], {
  cwd: new URL("../services/optimizer/", import.meta.url),
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(`optimizer tests could not start with ${python}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
