#!/usr/bin/env bash
# ONE owner-run phase-acceptance gate; must NOT be marked PASS on package delivery.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
trap 'echo "PHASE 4 CONSOLIDATED LOCAL ACCEPTANCE: FAIL; do NOT commit" >&2' ERR
python3 scripts/phase4/preflight.py
DB_CONTAINER="$(python3 -c 'import sys;sys.path.insert(0,"scripts/phase3");from local_db import verify_local;print(verify_local())')"
# Ensure nine registered migrations, no reset or historical SQL rewrite.
COUNT="$(docker exec "$DB_CONTAINER" psql -X -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
  -c "select count(*) from supabase_migrations.schema_migrations where version in ('20261015100000','20261015100100','20261015100200','20261015100300')")"
[[ "$COUNT" == '4' ]] || { echo 'Phase 4 migrations are not all applied' >&2; exit 1; }
for sql in \
  supabase/tests/phase3_block2_step4_profile_checks.sql \
  supabase/tests/phase3_block2_step5_rls_read_checks.sql \
  supabase/tests/phase3_block2_step6_permissions_checks.sql \
  supabase/tests/phase3_final_sql_security_checks.sql \
  supabase/tests/phase4_sql_acceptance.sql; do
  echo "SQL local transaction check: $(basename "$sql")"
  docker exec -i "$DB_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$sql" >/dev/null
done
node --test scripts/phase4/tests/parser.test.mjs
python3 supabase/tests/phase3_block2_step4_http_auth_test.py
python3 supabase/tests/phase3_real_jwt_http_security.py
# Verify Edge against the existing local Supabase stack. The owner may already have
# started this Function manually. NEVER start a competing Functions CLI or kill a
# process that this verifier did not start.
EDGE_ENDPOINT='http://127.0.0.1:54321/functions/v1/competition'
EDGE_PID=''
EDGE_LOG=''
edge_code() {
  curl --silent --show-error --output /dev/null \
    --connect-timeout 1 --max-time 2 --write-out '%{http_code}' \
    "$EDGE_ENDPOINT" 2>/dev/null || true
}
edge_cleanup() {
  if [[ -n "$EDGE_PID" ]]; then
    kill "$EDGE_PID" 2>/dev/null || true
    wait "$EDGE_PID" 2>/dev/null || true
    EDGE_PID=''
  fi
}
finish() {
  local status=$?
  trap - EXIT
  edge_cleanup
  if (( status != 0 )); then
    echo 'PHASE 4 CONSOLIDATED LOCAL ACCEPTANCE: FAIL; do NOT commit' >&2
  fi
}
trap - ERR
trap finish EXIT
EDGE_HTTP="$(edge_code)"
if [[ "$EDGE_HTTP" == '405' ]]; then
  echo 'PHASE 4 EDGE: reusing existing local competition endpoint (GET=405; server remains owner-controlled)'
elif [[ "$EDGE_HTTP" == '000' || -z "$EDGE_HTTP" ]]; then
  # The local stack was started using this restricted, localhost-bound network.
  # Supply it explicitly so the Functions worker joins the same network.
  docker network inspect puzzle-league-local >/dev/null 2>&1 || {
    echo 'PHASE 4 EDGE: required puzzle-league-local Docker network missing; no changes made' >&2
    exit 1
  }
  EDGE_LOG_DIR="${HOME}/.local/share/puzzle-league-phase4-diagnostics"
  mkdir -p "$EDGE_LOG_DIR"
  chmod 700 "$EDGE_LOG_DIR"
  EDGE_LOG="$(mktemp "$EDGE_LOG_DIR/verify-edge.XXXXXXXX.log")"
  chmod 600 "$EDGE_LOG"
  npx --no-install supabase functions serve competition --no-verify-jwt \
    --network-id puzzle-league-local >"$EDGE_LOG" 2>&1 &
  EDGE_PID=$!
  READY=0
  for i in $(seq 1 15); do
    if ! kill -0 "$EDGE_PID" 2>/dev/null; then
      echo "PHASE 4 EDGE: Functions process exited; inspect private log $EDGE_LOG (redact secrets)" >&2
      exit 1
    fi
    EDGE_HTTP="$(edge_code)"
    if [[ "$EDGE_HTTP" == '405' ]]; then READY=1; break; fi
    if [[ "$EDGE_HTTP" != '000' && "$EDGE_HTTP" != '502' && "$EDGE_HTTP" != '503' ]]; then
      echo "PHASE 4 EDGE: unexpected HTTP $EDGE_HTTP during startup; inspect private log" >&2
      exit 1
    fi
    sleep 2
  done
  if [[ "$READY" != '1' ]]; then
    echo "PHASE 4 EDGE: timed out awaiting GET=405 (last HTTP $EDGE_HTTP); private log $EDGE_LOG" >&2
    exit 1
  fi
  echo 'PHASE 4 EDGE: started on puzzle-league-local; GET=405 readiness PASS'
else
  echo "PHASE 4 EDGE: local endpoint gave HTTP $EDGE_HTTP, expected 405; refusing to start another worker" >&2
  exit 1
fi
# Readiness is not authorization. Real signed-JWT API checks follow.
python3 supabase/tests/phase4_http_acceptance.py
# Stop only the instance launched by this verifier, not an external worker.
edge_cleanup
# Backup, independent Phase 3 application-schema restore, and existing static/regressions.
python3 scripts/phase4/backup_restore_verify.py
npm run check
python3 scripts/phase3/package_integrity.py
python3 scripts/phase3/static_tests.py
python3 scripts/phase3/source_baseline_test.py
# Unattended season renewal must be independently configured, not just manually callable.
python3 scripts/phase4/scheduler_check.py
git diff --check
git diff --cached --check
printf '\nPHASE 4 CONSOLIDATED LOCAL ACCEPTANCE: PASS\n'
printf 'NOT VERIFIED: hosted CI, managed Supabase, Android/Cloudflare, real-game authenticity, production pilot\n'
