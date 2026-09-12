import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  PersonalOptimizerInputSchema,
  PersonalOptimizerResultSchema,
  type PersonalOptimizerInput,
  type PersonalOptimizerResult,
} from "@octro/contracts";
import { OptimizerTimeoutError, OptimizerUnavailableError } from "@octro/application";
import type { OptimizerPort } from "@octro/application";

const MAX_OUTPUT_BYTES = 1_000_000;
const SOLVER_TIMEOUT_MS = 5_000;
const OPTIMIZER_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../services/optimizer");

// Transport adapter only: all financial calculation runs in the standalone
// Python service. The one-shot stdin/stdout protocol avoids keeping an
// internal HTTP server alive and is straightforward to test and supervise.
export class PythonOptimizerAdapter implements OptimizerPort {
  async optimizePersonal(input: PersonalOptimizerInput): Promise<PersonalOptimizerResult> {
    const normalized = PersonalOptimizerInputSchema.parse(input);
    const python = process.env["OCTRO_PYTHON"] ?? (process.platform === "win32" ? "python" : "python3");

    return await new Promise<PersonalOptimizerResult>((resolveResult, rejectResult) => {
      const child = spawn(python, ["-m", "octro_optimizer.cli"], {
        cwd: OPTIMIZER_DIRECTORY,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const settleError = (error: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        rejectResult(error);
      };
      const timeout = setTimeout(() => {
        child.kill();
        settleError(new OptimizerTimeoutError());
      }, SOLVER_TIMEOUT_MS);

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
        if (Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) {
          child.kill();
          settleError(new OptimizerUnavailableError("optimizer response exceeded the size limit"));
        }
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr = (stderr + chunk).slice(-4_000);
      });
      child.on("error", () => {
        settleError(new OptimizerUnavailableError("Python optimizer process could not be started"));
      });
      child.on("close", (code) => {
        if (settled) return;
        clearTimeout(timeout);
        if (code !== 0) {
          // Keep low-level details out of HTTP responses and user-visible logs.
          settleError(new OptimizerUnavailableError(stderr.trim() || "Python optimizer returned an error"));
          return;
        }
        try {
          const parsed = PersonalOptimizerResultSchema.parse(JSON.parse(stdout) as unknown);
          settled = true;
          resolveResult(parsed);
        } catch {
          settleError(new OptimizerUnavailableError("Python optimizer returned an invalid result"));
        }
      });
      child.stdin.on("error", () => {
        settleError(new OptimizerUnavailableError("optimizer input could not be written"));
      });
      child.stdin.end(JSON.stringify(normalized));
    });
  }
}
