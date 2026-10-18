#!/usr/bin/env bash
set -euo pipefail
repo="${1:-$HOME/Desktop/Development/Puzzle_League}"
cd -- "$repo"
[[ "$(git rev-parse --short HEAD)" == '2f01d63' ]] || { echo 'STOP: wrong Git commit' >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'STOP: tracked source changes' >&2; exit 1; }
export PL_RUN_DB_READONLY=1
export PL_RECONCILE_OUT="${PL_RECONCILE_OUT:-$HOME/Desktop/Puzzle_League_Backups/phase6_reconciliation}"
mkdir -p "$PL_RECONCILE_OUT"; chmod 700 "$PL_RECONCILE_OUT"
echo '=== Existing source/build/identity and read-only DB gate ==='
bash scripts/phase6/verify.sh
echo '=== Remaining identity evidence contract ==='
node --test scripts/phase6/tests/remaining-results.test.mjs
echo '=== Private read-only source-to-evidence comparison ==='
node scripts/phase6/remaining-results.mjs --read-only
echo 'PHASE 6 REMAINING RESULTS READ-ONLY LOCAL GATE: PASS'
echo 'RELEASE REMAINS OPEN: identity/eligibility decisions, GitHub CI, HTTPS hosting, Android Share Target and real pilot NOT VERIFIED.'
