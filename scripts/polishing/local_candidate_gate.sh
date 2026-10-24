#!/usr/bin/env bash
# One developer-side suite. Does not contact, migrate or deploy hosted services.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
branch="$(git branch --show-current)"
if [[ "$branch" == 'main' || -z "$branch" ]]; then
  echo 'STOP: run in the isolated feat/polishing-* branch, not main/detached HEAD' >&2
  exit 2
fi
git diff --check
node --test tests/*.test.mjs scripts/phase4/tests/*.test.mjs scripts/phase5/tests/*.test.mjs scripts/phase6/tests/*.test.mjs scripts/release/tests/*.test.mjs
node scripts/run-research-tests.mjs
npm ci
npm run check
echo 'LOCAL CANDIDATE CHECKS PASS (not evidence of SQL/RLS, Auth restoration or hosted acceptance)'
