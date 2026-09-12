import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const requirements = readJson("requirements.json");
const packRequirements = readJson("docs/v2.2/requirements.json");
const config = readJson("docs/v2.2/hackathon.config.json");
const evidencePath = "docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json";
const evidence = readJson(evidencePath);
const evidenceDir = dirname(resolve(root, evidencePath));

expect(requirements.version === "2.2", "requirements.json must remain v2.2");
expect(requirements.requirements.length === 62, "requirements.json must contain the 62 v2.2 requirements");
expect(new Set(requirements.requirements.map(({ id }) => id)).size === 62, "requirement IDs must be unique");
expect(
  JSON.stringify(requirements.requirements) === JSON.stringify(packRequirements.requirements),
  "root and preserved pack requirement entries diverge",
);
expect(
  JSON.stringify(requirements.invariants) === JSON.stringify(packRequirements.invariants),
  "root and preserved pack invariants diverge",
);
for (const path of requirements.normative_files) {
  expect(existsSync(resolve(root, path)), `missing normative file: ${path}`);
}

expect(config.spec_version === "2.2", "hackathon config must target spec v2.2");
expect(config.track === 1, "hackathon config must remain on Track 1");
expect(config.flavour === "Loaded", "hackathon config must remain Loaded");
expect(config.protocol === "V1", "hackathon config must remain Lending Protocol V1");
expect(config.vault === "open-ended", "hackathon config must keep the open-ended vault decision");
if (config.ledger_verified) {
  expect(Number.isInteger(config.network_id), "a verified ledger requires a numeric network_id");
  expect(typeof config.sdk_version === "string" && !config.sdk_version.includes("beta"), "verified Track 1 requires an exact stable SDK version");
  expect(typeof config.checked_at === "string", "verified capabilities require checked_at");
  expect(existsSync(resolve(root, config.g0_evidence_ref)), "verified ledger requires its G0 evidence file");
}
for (const [capability, status] of Object.entries(config.capabilities)) {
  expect(["verified", "unverified", "unsupported"].includes(status), `invalid capability status: ${capability}=${status}`);
}

for (const step of evidence.steps) {
  if (step.status === "validated") {
    expect(step.validated === true, `${step.id}: validated status requires validated=true`);
    expect(typeof step.result_code === "string", `${step.id}: validated status requires result_code`);
    if (step.tx_hash) expect(typeof step.explorer_url === "string", `${step.id}: on-ledger hash requires explorer_url`);
  } else if (step.status === "rejected_pre_inclusion") {
    expect(step.validated === false, `${step.id}: pre-inclusion rejection requires validated=false`);
    expect(step.explorer_url === null, `${step.id}: pre-inclusion rejection must not claim an explorer proof`);
  } else if (step.status === "not_run") {
    expect(step.validated === null, `${step.id}: not_run requires validated=null`);
    expect(step.tx_hash === null && step.explorer_url === null, `${step.id}: not_run must not contain ledger proof`);
  } else if (step.status === "reconciled_from_ledger_effects") {
    expect(step.validated === true, `${step.id}: reconciled ledger effects require validated=true`);
  } else {
    failures.push(`${step.id}: unknown evidence status ${step.status}`);
  }
  for (const ref of step.evidence_refs ?? []) {
    expect(existsSync(join(evidenceDir, ref)), `${step.id}: missing evidence ref ${ref}`);
  }
}

if (failures.length > 0) {
  console.error("traceability check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`traceability check passed (62 requirements, ${evidence.steps.length} evidence states, Track 1 Loaded V1)`);
