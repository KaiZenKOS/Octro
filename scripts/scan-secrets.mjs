import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// SEC-04 / SEC-LOAD-01: lightweight, cross-platform guard for text files in the
// Git working tree (tracked and non-ignored untracked files). Findings identify
// only the rule and location; suspected values are never printed to CI logs.
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["aws-access-key", /AKIA[0-9A-Z]{16}/],
  ["slack-token", /xoxb-[0-9A-Za-z-]{10,}/],
  ["provider-secret", /sk-(?:(?:live|test|proj|svcacct)[-_])?[0-9A-Za-z_-]{16,}/],
  ["xrpl-family-seed", /(?:^|[^1-9A-HJ-NP-Za-km-z])s(?:hex1|Ed)?[1-9A-HJ-NP-Za-km-z]{25,34}(?:$|[^1-9A-HJ-NP-Za-km-z])/],
  ["secret-assignment", /\b(?:[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|INVITE_CODE|API_KEY|ACCESS_KEY|AUTH_TOKEN|SEED))[A-Z0-9_]*\s*=\s*\S{6,}/],
  ["public-client-secret-name", /\bEXPO_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\b/],
];

const allowedExtensions = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|jsonl|env|yml|yaml|md|txt|log|py|sql|toml|sh|ps1|xml|html|css|scss|ini|properties)$/i;
const excluded = new Set([
  // npm integrity values are random base64 and can resemble XRPL family seeds.
  "package-lock.json",
  "scripts/scan-secrets.mjs",
]);

const candidates = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((path) => allowedExtensions.test(path) || path === ".env.example")
  .filter((path) => !excluded.has(path))
  .filter((path) => !/(^|\/)(?:node_modules|dist|\.git|\.xrpl-devex)(\/|$)/.test(path));

const findings = [];
let checkedFileCount = 0;
for (const path of candidates) {
  // `git ls-files` also lists deleted files. Skip them while still scanning
  // tracked and non-ignored untracked text that may enter a commit.
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

console.log(`secret scan passed (${checkedFileCount} working-tree source/config/documentation files checked)`);
