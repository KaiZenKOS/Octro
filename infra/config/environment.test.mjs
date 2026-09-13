import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateBackendEnvironment } from "./environment.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const template = Object.fromEntries(readFileSync(new URL("../../.env.example", import.meta.url), "utf8")
  .split(/\r?\n/).filter((line) => line && !line.startsWith("#"))
  .map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));
const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const valid = () => ({
  ...template,
  PGPASSWORD: "unit-test-only",
  S3_ACCESS_KEY_ID: "unit-test-only",
  S3_SECRET_ACCESS_KEY: "unit-test-only",
  WALLET_SEED_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
  ODOO_API_KEY_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
});
const variables = (env) => validateBackendEnvironment(env).issues.map((issue) => issue.variable);

test("template fails until locally provisioned secrets are supplied", () => {
  assert.deepEqual(
    variables(template).sort(),
    ["PGPASSWORD", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "WALLET_SEED_ENCRYPTION_KEY", "ODOO_API_KEY_ENCRYPTION_KEY"].sort(),
  );
  assert.equal(validateBackendEnvironment(valid()).valid, true);
});

test("encryption keys must decode to exactly 32 bytes", () => {
  for (const key of ["WALLET_SEED_ENCRYPTION_KEY", "ODOO_API_KEY_ENCRYPTION_KEY"]) {
    assert.ok(variables({ ...valid(), [key]: "" }).includes(key));
    assert.ok(variables({ ...valid(), [key]: "dG9vLXNob3J0" }).includes(key));
  }
});

test("optional providers do not require credentials for the base configuration", () => {
  const report = validateBackendEnvironment(valid());
  assert.deepEqual(report.services, { postgres: true, mongodb: false, s3: true, kyc: false, mail: false });
  for (const [flag, key] of [["MONGODB_ENABLED", "MONGODB_PASSWORD"], ["KYC_ENABLED", "DIDIT_API_KEY"], ["MAIL_ENABLED", "MAIL_API_TOKEN"]]) {
    assert.ok(variables({ ...valid(), [flag]: "true" }).includes(key));
  }
});

test("remote TLS verification cannot be disabled", () => {
  assert.ok(variables({ ...valid(), PGSSLMODE: "require" }).includes("PGSSLMODE"));
  assert.ok(variables({ ...valid(), NODE_TLS_REJECT_UNAUTHORIZED: "0" }).includes("NODE_TLS_REJECT_UNAUTHORIZED"));
  const env = { ...valid(), MONGODB_ENABLED: "true", MONGODB_PASSWORD: "unit-test-only" };
  assert.equal(validateBackendEnvironment(env).valid, true);
  for (const key of ["MONGODB_TLS_ALLOW_INVALID_CERTIFICATES", "MONGODB_TLS_ALLOW_INVALID_HOSTNAMES"]) {
    assert.ok(variables({ ...env, [key]: "true" }).includes(key));
  }
});

test("bucket URL cannot be substituted for service endpoint; TTL is bounded", () => {
  assert.ok(variables({ ...valid(), S3_ENDPOINT_URL: "https://octro.fr-par-1.linodeobjects.com" }).includes("S3_ENDPOINT_URL"));
  for (const ttl of ["0", "901", "300seconds"]) {
    assert.ok(variables({ ...valid(), S3_SIGNED_URL_TTL_SECONDS: ttl }).includes("S3_SIGNED_URL_TTL_SECONDS"));
  }
});

test("reject malformed flags and credentials embedded in public URLs", () => {
  assert.ok(variables({ ...valid(), POSTGRES_ENABLED: "yes" }).includes("POSTGRES_ENABLED"));
  assert.ok(variables({ ...valid(), API_PUBLIC_URL: "https://test:unit-test-only@example.invalid" }).includes("API_PUBLIC_URL"));
  assert.ok(variables({ ...valid(), APP_ORIGINS: "https://octro.co/anything" }).includes("APP_ORIGINS"));
});

test("required PostgreSQL and syntactically valid hosts/bucket cannot be omitted", () => {
  for (const flag of ["", "false"]) {
    assert.ok(variables({ ...valid(), POSTGRES_ENABLED: flag }).includes("POSTGRES_ENABLED"));
  }
  for (const hostname of ["core..example.com", "-core.example.com", "core-.example.com", `${"a".repeat(64)}.example.com`]) {
    assert.ok(variables({ ...valid(), PGHOST: hostname }).includes("PGHOST"));
  }
  for (const bucket of ["bad / bucket", "UPPERCASE", "a..b", "127.0.0.1"]) {
    assert.ok(variables({ ...valid(), S3_BUCKET: bucket }).includes("S3_BUCKET"));
  }
});

test("CLI never emits supplied secrets or erroneous raw values", () => {
  const marker = "offline-sensitive-marker";
  const env = { ...valid(), PGPASSWORD: marker, S3_SECRET_ACCESS_KEY: marker, PGPORT: marker,
    API_PUBLIC_URL: `https://test:${marker}@example.invalid`, MAIL_API_TOKEN: marker };
  const result = spawnSync(process.execPath, ["scripts/check-backend-config.mjs"], { cwd: root, env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal((result.stdout + result.stderr).includes(marker), false);
  assert.equal(JSON.parse(result.stdout).valid, false);
});
