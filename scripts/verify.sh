#!/usr/bin/env bash
# Runs every check the site has, so "is it done?" has one answer.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ unit tests"
npm test --silent

echo "→ no debug code in shipped JS"
if grep -rnE "console\.(log|debug)|debugger" js/; then
  echo "debug code found in js/" >&2
  exit 1
fi

echo "✓ all checks passed"
