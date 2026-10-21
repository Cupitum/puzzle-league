#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
git merge-base --is-ancestor 'ab7122b4e72c0396b95e1280f15e4032ef1c8903' HEAD || { echo 'STOP: release source anchor missing from Git history' >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'STOP: commit tracked changes before full release gate' >&2; exit 1; }
[[ "$(git branch --show-current)" == 'main' ]] || { echo 'STOP: main branch required' >&2; exit 1; }
[[ -z "$(git diff --name-only -- supabase/migrations research)" ]] || { echo 'STOP: protected migration/research changes' >&2; exit 1; }
for file in public/_headers scripts/release/production-build.mjs \
  scripts/release/release-config.mjs scripts/release/hosted-smoke.mjs \
  scripts/release/remote-dry-run.sh scripts/release/tests/release-contract.test.mjs \
  .github/workflows/release-readiness.yml; do
  [[ -f "$file" ]] || { echo "STOP: missing $file" >&2; exit 1; }
done
printf '=== Phase 6 release contracts ===\n'
node --test scripts/release/tests/release-contract.test.mjs
printf '=== Existing integrated static, DB and build gate ===\n'
export PL_RUN_DB_READONLY=1
export PL_RECONCILE_OUT="${PL_RECONCILE_OUT:-$HOME/Desktop/Puzzle_League_Backups/phase6_reconciliation}"
mkdir -p "$PL_RECONCILE_OUT"
chmod 700 "$PL_RECONCILE_OUT"
bash scripts/phase6/verify.sh
node scripts/phase6/remaining-results.mjs --read-only
printf 'PHASE 6 DEPLOYMENT PACKAGE LOCAL READINESS: PASS\n'
printf 'HOSTED GATES: NOT VERIFIED (CLOUD AUTH, REMOTE MIGRATIONS, CI, HTTPS DEVICE, REAL PILOT)\n'
