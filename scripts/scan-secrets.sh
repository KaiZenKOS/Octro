#!/usr/bin/env bash
# Scan minimal de secrets pour la CI (OPS-02, SEC-04). Ne remplace pas un
# outil dedie (gitleaks, trufflehog) : c'est un filet de securite leger sur
# les fichiers suivis par git, sans dependance externe ni reseau.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PATTERNS=(
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'                                   # AWS access key id
  'xoxb-[0-9A-Za-z-]{10,}'                              # Slack bot token
  'sk-(live|test)?_[0-9A-Za-z]{16,}'                    # style de cle Stripe/OpenAI
  '\b[sS](hex1|Ed)?[1-9A-HJ-NP-Za-km-z]{25,34}\b'      # graine de famille XRPL
  '\b(SECRET|PASSWORD|PRIVATE_KEY|INVITE_CODE)[A-Z_]*[[:space:]]*=[[:space:]]*[^[:space:]]{6,}'
)

FILES=$(git ls-files -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.json' '*.env*' '*.yml' '*.yaml' \
  | grep -v -E '(^|/)(node_modules|dist|\.xrpl-devex)/' || true)

if [ -z "$FILES" ]; then
  echo "scan-secrets: no tracked files to scan"
  exit 0
fi

found=0
for pattern in "${PATTERNS[@]}"; do
  if matches=$(echo "$FILES" | xargs grep -nE "$pattern" 2>/dev/null); then
    echo "scan-secrets: possible secret matching /$pattern/:"
    echo "$matches"
    found=1
  fi
done

if [ "$found" -eq 1 ]; then
  echo "scan-secrets: FAILED — remove the value above before committing (SEC-04)."
  exit 1
fi

echo "scan-secrets: no obvious secret found in tracked files."
