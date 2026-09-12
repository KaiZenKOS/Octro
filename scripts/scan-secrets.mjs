import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// SEC-04 / SEC-LOAD-01: lightweight, cross-platform guard for tracked source
// files. Findings identify only the rule and location; the suspected value is
// deliberately never printed to CI logs.
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["aws-access-key", /AKIA[0-9A-Z]{16}/],
  ["slack-token", /xoxb-[0-9A-Za-z-]{10,}/],
  ["provider-secret", /sk-(?:live|test)?_[0-9A-Za-z]{16,}/],
  ["xrpl-family-seed", /(?:^|[^1-9A-HJ-NP-Za-km-z])s(?:hex1|Ed)?[1-9A-HJ-NP-Za-km-z]{25,34}(?:$|[^1-9A-HJ-NP-Za-km-z])/],
  ["secret-assignment", /\b(?:SECRET|PASSWORD|PRIVATE_KEY|INVITE_CODE)[A-Z_]*\s*=\s*\S{6,}/],
  ["public-client-secret-name", /\bEXPO_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\b/],
];

const allowedExtensions = /\.(?:ts|tsx|js|mjs|json|env|yml|yaml)$/i;
const excluded = new Set([
  "package-lock.json",
  "scripts/scan-secrets.mjs",
]);

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((path) => allowedExtensions.test(path) || path === ".env.example")
  .filter((path) => !excluded.has(path))
  .filter((path) => !/(^|\/)(?:node_modules|dist|\.xrpl-devex)(\/|$)/.test(path));

const findings = [];
let checkedFileCount = 0;
for (const path of tracked) {
  // `git ls-files` also lists files deleted in the working tree. Skipping those
  // keeps this guard usable during refactors while still scanning every file
  // that can actually enter the build or the commit.
  if (!existsSync(path)) continue;
  checkedFileCount += 1;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const [rule, pattern] of rules) {
      if (pattern.test(lines[index])) {
        findings.push({ path, line: index + 1, rule });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("secret scan failed (values redacted):");
  for (const finding of findings) {
    console.error(`- ${finding.path}:${finding.line} [${finding.rule}]`);
  }
  process.exit(1);
}

console.log(`secret scan passed (${checkedFileCount} tracked source/config files checked)`);
