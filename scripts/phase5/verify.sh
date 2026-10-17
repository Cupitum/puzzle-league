#!/usr/bin/env bash
# Consolidated Ubuntu local acceptance. Separate real Android HTTPS/device sign-off is mandatory.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
[[ "$(git rev-parse HEAD)" == '47ea0df00e54722e96b0c6e7d1b191fa5e125572' ]] || { echo 'Wrong Phase 5 source anchor: inspect history' >&2; exit 1; }
trap 'echo "PHASE 5 LOCAL ACCEPTANCE: FAIL; do not commit" >&2' ERR
node --check public/sw.js
node --test scripts/phase5/tests/pwa-contract.test.mjs scripts/phase5/tests/share-target-runtime.test.mjs scripts/phase5/tests/onboarding-contract.test.mjs scripts/phase5/tests/session-league-contract.test.mjs
python3 -m unittest discover -s scripts/phase5/tests -p "test_local_env_setup.py" -v
node scripts/phase5/audit.mjs
node --test scripts/phase4/tests/parser.test.mjs
npm run check

# Test generated PWA assets with actual local HTTP server, not just file existence.
SERVER_PID=''
EDGE_PID=''
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; fi
  if [[ -n "$EDGE_PID" ]]; then kill "$EDGE_PID" 2>/dev/null || true; wait "$EDGE_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort >/dev/null 2>&1 & SERVER_PID=$!
READY=0
for _ in $(seq 1 15); do
  if curl -fsS --max-time 2 http://127.0.0.1:4173/manifest.webmanifest >/dev/null 2>&1; then READY=1;break;fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo 'PWA local preview failed' >&2;exit 1; }
for path in / /manifest.webmanifest /sw.js /icons/icon-192.png /icons/icon-512.png; do
  curl -fsS --max-time 8 "http://127.0.0.1:4173$path" -o /dev/null || { echo "PWA route missing: $path" >&2; exit 1; }
done
printf 'PASS: built frontend, manifest, service worker and icons served over localhost\n'
kill "$SERVER_PID" 2>/dev/null || true;wait "$SERVER_PID" 2>/dev/null || true;SERVER_PID=''

# Phase 5 made no migrations; verify existing local Phase 4 server rather than running
# its old preflight (which intentionally pins its *historical* 9b5a40a source commit).
python3 - <<'PY'
import sys
sys.path.insert(0,'scripts/phase3')
from local_db import verify_local, psql
verify_local()
actual=set(psql('select version from supabase_migrations.schema_migrations;').splitlines())
required={'20261012170000','20261013220000','20261013220100','20261013220200',
 '20261014150000','20261015100000','20261015100100','20261015100200','20261015100300'}
assert actual==required, 'Unexpected migration inventory: STOP and review before acceptance'
print('PASS: exact nine local migration IDs unchanged')
PY
# Start local Edge *only* if no running owner-controlled instance exists.
edge_status() { curl -s -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 2 'http://127.0.0.1:54321/functions/v1/competition' 2>/dev/null || true; }
STATUS="$(edge_status)"
if [[ "$STATUS" == '405' ]]; then
  echo 'Using existing owner-managed local Edge endpoint'
elif [[ "$STATUS" == '000' || -z "$STATUS" ]]; then
  docker network inspect puzzle-league-local >/dev/null
  LOGDIR="$HOME/.local/share/puzzle-league-phase5-diagnostics"
  mkdir -p "$LOGDIR";chmod 700 "$LOGDIR"
  LOG="$(mktemp "$LOGDIR/edge.XXXXXXXX.log")";chmod 600 "$LOG"
  npx --no-install supabase functions serve competition --no-verify-jwt --network-id puzzle-league-local >"$LOG" 2>&1 & EDGE_PID=$!
  READY=0
  for _ in $(seq 1 15); do
    kill -0 "$EDGE_PID" 2>/dev/null || { echo "Edge worker exited; inspect private $LOG after redacting" >&2;exit 1; }
    if [[ "$(edge_status)" == 405 ]];then READY=1;break;fi
    sleep 2
  done
  [[ "$READY" == 1 ]] || { echo "Edge readiness failed; private log: $LOG" >&2;exit 1; }
else
  echo "Unexpected Edge status $STATUS; no second worker started" >&2;exit 1
fi
python3 supabase/tests/phase3_real_jwt_http_security.py
python3 supabase/tests/phase4_http_acceptance.py
python3 scripts/phase4/scheduler_check.py
# Existing SQL history is non-destructively exercised by rollback-only tests.
DB_CONTAINER="$(python3 -c 'import sys;sys.path.insert(0,"scripts/phase3");from local_db import verify_local;print(verify_local())')"
for script in supabase/tests/phase3_block2_step5_rls_read_checks.sql \
  supabase/tests/phase3_block2_step6_permissions_checks.sql \
  supabase/tests/phase3_final_sql_security_checks.sql \
  supabase/tests/phase4_sql_acceptance.sql; do
  docker exec -i "$DB_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$script" >/dev/null
  echo "PASS: $(basename "$script")"
done
python3 scripts/phase3/source_baseline_test.py
git diff --check
git diff --cached --check
printf '\nPHASE 5 CONSOLIDATED LOCAL ACCEPTANCE: PASS (SOURCE, FRONTEND, SQL, JWT/EDGE; NOT DEVICE)\n'
printf 'BLOCKED UNTIL PHYSICAL DEVICE EVIDENCE: HTTPS installed Android PWA share target and owner UX signoff.\n'
