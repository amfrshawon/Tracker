#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20+ first."
  exit 1
fi

npm run sanitize
npm run db:generate
npm run check

echo "✅ Verification complete"
