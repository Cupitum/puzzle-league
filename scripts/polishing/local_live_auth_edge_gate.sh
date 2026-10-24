#!/usr/bin/env bash
# Truly local GoTrue + PostgREST + Postgres integration rehearsal with SYNTHETIC accounts.
# Executes actual Edge handler source in a local Node VM with real HTTP fetch.
# It does NOT start deployed edge-runtime, use hosted data, or test external SMTP.
set -euo pipefail
umask 077
fail(){ printf 'BLOCKED: %s\n' "$*" >&2; exit 2; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"
[[ -d .git ]] || fail 'Git working tree required'
[[ "$(git branch --show-current)" == feat/polishing-acceptance-20261024 ]] || fail 'Run only on polishing branch'
[[ -f supabase/migrations/20261023100000_polishing_permissions_and_requests.sql ]] || fail 'Candidate permissions SQL missing'
[[ -f supabase/migrations/20261023100100_polishing_verified_streak.sql ]] || fail 'Candidate streak SQL missing'
[[ -f supabase/migrations/20261023100200_polishing_identity_evidence.sql ]] || fail 'Identity migration missing'
[[ -f supabase/migrations/20261024170000_polishing_account_recovery_and_history.sql ]] || fail 'Account verification migration missing'
[[ -f tests/polishing-edge-boundary.test.mjs ]] || fail 'Previous security gate must be installed'
[[ -x node_modules/.bin/supabase ]] || fail 'Local Supabase CLI missing; use existing npm install'
command -v docker >/dev/null || fail 'Docker missing'
command -v python3 >/dev/null || fail 'Python missing'
docker info >/dev/null 2>&1 || fail 'Docker unavailable'
# Do not inherit any remote credentials/linked-project environment.
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
export SUPABASE_TELEMETRY_ENABLED=false
ROOT_BASE="$HOME/Desktop"
[[ -d "$ROOT_BASE" ]] || fail 'Desktop directory missing'
WORK="$(mktemp -d "$ROOT_BASE/Puzzle_League_Local_Auth_Edge_XXXXXXXX")"
SUFFIX="${WORK##*_}"
ID="pzlauth_$(printf %s "$SUFFIX" | tr 'A-Z' 'a-z')"
[[ "$ID" =~ ^pzlauth_[a-f0-9]{8}$ ]] || {
  # mktemp uses alphabetic chars outside hex: generate a dedicated eight-digit hex suffix.
  ID="pzlauth_$(python3 -c 'import secrets; print(secrets.token_hex(4))')"
}
NET="${ID}_loopback"
CLI="$ROOT/node_modules/.bin/supabase"
mkdir -m 700 "$WORK/supabase" "$WORK/supabase/migrations"
cp -p supabase/migrations/*.sql "$WORK/supabase/migrations/"
: >"$WORK/supabase/seed.sql"
python3 scripts/polishing/make_live_auth_config.py \
  "$ROOT/supabase/config.toml" "$WORK/supabase/config.toml" "$ID" || fail 'Scratch config could not be produced'
STARTED=0; NET_CREATED=0
cleanup(){
  rc=$?; trap - EXIT
  if [[ "$STARTED" == 1 ]]; then
    (cd "$WORK" && "$CLI" stop --no-backup --project-id "$ID" >"$WORK/stop.private.log" 2>&1) || \
      printf 'WARNING: Review private cleanup for %s; do not leave synthetic stack running.\n' "$ID" >&2
  fi
  if [[ "$NET_CREATED" == 1 ]]; then docker network rm "$NET" >/dev/null 2>&1 || true; fi
  printf 'PRIVATE LOCAL TEST LOG DIRECTORY: %s\n' "$WORK"
  exit "$rc"
}
trap cleanup EXIT
printf 'SYNTHETIC LOCAL PROJECT: %s\n' "$ID"
docker network create --driver bridge -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 "$NET" >/dev/null || fail 'Cannot create loopback-only Docker bridge'
NET_CREATED=1
STARTED=1
# Only DB + Auth + Gateway + REST; skip mail, storage, realtime and everything unrelated.
if ! (cd "$WORK" && "$CLI" start --network-id "$NET" \
  -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor \
  >"$WORK/start.private.log" 2>&1); then
  fail 'Scratch stack startup failed. Consult private start log, never paste tokens.'
fi
python3 - "$ID" <<'PY'
import json, subprocess, sys
ident=sys.argv[1]
rows=subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines()
matched=[n for n in rows if n.startswith('supabase_') and n.endswith('_'+ident)]
required={'supabase_db_'+ident,'supabase_auth_'+ident,
          'supabase_kong_'+ident,'supabase_rest_'+ident}
if not required.issubset(matched):
    raise SystemExit('BLOCKED: missing local DB/Auth/Kong/REST container')
for name in matched:
    doc=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
    for bindings in (doc['NetworkSettings'].get('Ports') or {}).values():
        for b in bindings or []:
            if b.get('HostIp') not in ('127.0.0.1','::1'):
                raise SystemExit('BLOCKED: non-local Docker port: no synthetic signups performed')
print('PASS: isolated synthetic DB, Auth and REST bound to loopback only.')
PY
(cd "$WORK" && "$CLI" status -o env >"$WORK/status.private.env" 2>"$WORK/status.private.log") || fail 'Local status not available; no credentials displayed'
chmod 600 "$WORK/status.private.env"
node "$ROOT/scripts/polishing/local_live_auth_edge.mjs" \
  "$WORK/status.private.env" "$ID" >"$WORK/integration.private.log" 2>&1 || {
    # The Node test reporter exposes only labels, no tokens or private SQL.
    grep -E '^(PASS|BLOCKED|FAIL|LOCAL|TEST_SUMMARY|FAILURE_GATE_STAGE|FAILURE_SQLSTATE|FAILURE_HTTP_STATUS):' "$WORK/integration.private.log" || true
    fail 'Synthetic real-GoTrue/REST/Edge-handler gate failed; inspect private log locally.'
  }
grep -E '^(PASS|LOCAL|TEST_SUMMARY):' "$WORK/integration.private.log" || true
printf 'LOCAL AUTH/JWT/POSTGREST + EDGE HANDLER GATE PASS — SYNTHETIC ONLY.\n'
printf 'NOT PROVEN: deployed Edge runtime, restored-user login, SMTP, identity sources, complete platform recovery or production.\n'
