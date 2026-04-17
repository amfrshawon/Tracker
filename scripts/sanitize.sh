#!/usr/bin/env bash
set -euo pipefail

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo "❌ .env is tracked by git. Remove it from version control immediately."
    exit 1
  fi
fi

for forbidden in \
  "BEGIN RSA PRIVATE KEY" \
  "BEGIN OPENSSH PRIVATE KEY" \
  "BEGIN EC PRIVATE KEY" \
  "AWS_SECRET_ACCESS_KEY" \
  "xoxb-" \
  "ghp_" \
  "sk_live_" \
  "AIza"; do
  if rg -n --hidden --glob '!.git/*' --glob '!node_modules/*' --glob '!scripts/sanitize.sh' "$forbidden" . >/dev/null; then
    echo "❌ Potential secret detected for pattern: $forbidden"
    rg -n --hidden --glob '!.git/*' --glob '!node_modules/*' --glob '!scripts/sanitize.sh' "$forbidden" .
    exit 1
  fi
done

echo "✅ Sanitize checks passed"
