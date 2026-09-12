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
const requirementIds = requirements.requirements.map(({ id }) => id);
const requirementIdSet = new Set(requirementIds);
expect(requirementIdSet.size === 62, "requirement IDs must be unique");
expect(
  JSON.stringify(requirements.requirements) === JSON.stringify(packRequirements.requirements),
  "root and preserved pack requirement entries diverge (including IDs, priority, owner, must, acceptance, and chapter)",
);
expect(
  JSON.stringify(requirements.invariants) === JSON.stringify(packRequirements.invariants),
  "root and preserved pack invariants diverge",
);
expect(JSON.stringify(requirements.parameters) === JSON.stringify(packRequirements.parameters), "root and preserved pack parameters diverge");
expect(JSON.stringify(requirements.audiences) === JSON.stringify(packRequirements.audiences), "root and preserved pack audiences diverge");
expect(requirements.project === packRequirements.project, "root and preserved pack project names diverge");
expect(requirements.language === packRequirements.language, "root and preserved pack language diverge");
expect(requirements.status === packRequirements.status, "root and preserved pack status diverge");
expect(requirements.date === packRequirements.date, "root and preserved pack dates diverge");
for (const path of requirements.normative_files) {
  expect(existsSync(resolve(root, path)), `missing normative file: ${path}`);
}

const knownRequirementPrefixes = [...new Set(requirementIds.map((id) => id.replace(/-\d+$/, "")))];
for (const path of [
  "docs/implementation-status.md",
  "docs/presentation/pitch-deck.md",
  "docs/presentation/video-demo-script.md",
]) {
  const text = readFileSync(resolve(root, path), "utf8");
  const mentionedIds = text.match(/\b[A-Z][A-Z0-9-]*-\d{2}\b/g) ?? [];
  for (const id of mentionedIds) {
    if (knownRequirementPrefixes.some((prefix) => id.startsWith(`${prefix}-`))) {
      expect(requirementIdSet.has(id), `${path}: unknown requirement ID ${id}`);
    }
  }
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
  expect(evidence.network_snapshot?.network_id === config.network_id, "G0 evidence network_id must match the active config");
  expect(evidence.network_snapshot?.sdk_package === config.sdk_package, "G0 evidence SDK package must match the active config");
  expect(evidence.network_snapshot?.sdk_version === config.sdk_version, "G0 evidence SDK version must match the active config");
}
for (const [capability, status] of Object.entries(config.capabilities)) {
  expect(["verified", "unverified", "unsupported"].includes(status), `invalid capability status: ${capability}=${status}`);
  if (status === "verified") {
    const note = config.capability_notes?.[capability] ?? "";
    const references = note.match(/(?:docs\/progress\/augustin\/evidence\/)?[A-Za-z0-9._-]+\.json/g) ?? [];
    let existingReferenceCount = 0;
    for (const ref of references) {
      const path = ref.startsWith("docs/") ? resolve(root, ref) : join(evidenceDir, ref);
      if (existsSync(path)) existingReferenceCount += 1;
    }
    expect(existingReferenceCount > 0, `verified capability ${capability} must cite an existing evidence file`);
  }
}

for (const step of evidence.steps) {
  if (step.status === "validated") {
    expect(step.validated === true, `${step.id}: validated status requires validated=true`);
    expect(typeof step.result_code === "string", `${step.id}: validated status requires result_code`);
    expect(typeof step.tx_hash === "string" && step.tx_hash.length > 0, `${step.id}: validated ledger result requires tx_hash`);
    expect(typeof step.explorer_url === "string" && step.explorer_url.startsWith("https://"), `${step.id}: validated ledger result requires an HTTPS explorer URL`);
  } else if (step.status === "rejected_pre_inclusion") {
    expect(step.validated === false, `${step.id}: pre-inclusion rejection requires validated=false`);
    expect(typeof step.result_code === "string", `${step.id}: pre-inclusion rejection requires an observed result code`);
    expect(step.explorer_url === null, `${step.id}: pre-inclusion rejection must not claim an explorer proof`);
  } else if (step.status === "not_run") {
    expect(step.validated === null, `${step.id}: not_run requires validated=null`);
    expect(step.tx_hash === null && step.explorer_url === null && step.result_code === null, `${step.id}: not_run must not contain ledger proof or result code`);
  } else if (step.status === "reconciled_from_ledger_effects") {
    expect(step.validated === true, `${step.id}: reconciled ledger effects require validated=true`);
    expect(step.tx_hash === null && step.explorer_url === null, `${step.id}: a derived reconciliation must not claim its own transaction hash or explorer URL`);
    expect(typeof step.evidence_refs?.[0] === "string", `${step.id}: ledger-effect reconciliation requires supporting evidence`);
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
