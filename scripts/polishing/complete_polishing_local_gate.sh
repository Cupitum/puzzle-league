#!/usr/bin/env bash
# One grouped local-only gate. Does NOT deploy or read private production backups.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"
fail(){ echo "BLOCKED: $*" >&2; exit 2; }
[[ "$(git branch --show-current)" == 'feat/polishing-integrated-20261023' ]] || fail 'Not on polishing feature branch'
[[ -f supabase/migrations/20261023100200_polishing_identity_evidence.sql ]] || fail 'Missing evidence migration'
[[ -f supabase/functions/competition/identity-evidence.mjs ]] || fail 'Missing five-game resolver'
# Reject accidental historic migration rewrites; git show references LOCAL commit only.
mapfile -t original < <(git ls-tree --name-only -r 267da00 -- supabase/migrations/ | grep '\.sql$')
[[ "${#original[@]}" -eq 13 ]] || fail 'Expected 13 original migration files in known source baseline'
for f in "${original[@]}"; do
  [[ -f "$f" ]] || fail 'A baseline migration is missing'
  cmp -s <(git show "267da00:$f") "$f" || fail 'Baseline migration content changed'
done
# Remote credentials are never needed for this suite.
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
printf 'PASS: original migrations untouched, candidate migration #16 present.\n'
node --test tests/polishing-sql-regex-contract.test.mjs tests/polishing-identity-evidence.test.mjs tests/polishing-submit-resolution.test.mjs
bash scripts/polishing/run_grouped_live_gate.sh
printf '\nPOLISHING CONSOLIDATED LOCAL ENGINEERING GATE PASS.\n'
printf 'NOT production acceptance: official feeds, SMTP code reset, restored-account sign-in, real deployed Edge, full platform recovery and responsive owner UAT remain gated.\n'
