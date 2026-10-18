#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
echo '=== SOURCE + MIGRATION GATE ==='
expected="${PL_EXPECTED_BASE:-4f96c44}"
if ! git merge-base --is-ancestor "$expected" HEAD; then echo 'FAIL: source anchor not in HEAD'; exit 1; fi
node --test scripts/phase4/tests/*.test.mjs scripts/phase6/tests/*.test.mjs
npm run check
if [[ "${PL_RUN_DB_READONLY:-0}" == 1 ]]; then
 : "${PL_RECONCILE_OUT:?Set private absolute output path}"
 node scripts/phase6/reconcile.mjs --read-only
fi
echo 'PHASE 6 RECONCILIATION LOCAL STATIC + READ-ONLY GATE: PASS'
echo 'NOT ASSERTED: manual puzzle evidence, any six repairs, owner live DB migration, hosted CI/HTTPS/pilot.'
