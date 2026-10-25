#!/usr/bin/env bash
# P9 local acceptance gate: read-only checks after the owner separately applies migration #18.
# This does NOT deploy to hosted Supabase/Cloudflare or auto-award existing submissions.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
trap 'echo "P9 LOCAL ACCEPTANCE: FAIL / no commit or hosted deployment" >&2' ERR
printf '=== Approved local-calendar parser and identity regression ===\n'
node --test scripts/phase4/tests/parser.test.mjs scripts/phase4/tests/polygonle-target.test.mjs scripts/phase4/tests/local-calendar-identity.test.mjs
printf '\n=== Preserved application/test quality gate ===\n'
npm run check
printf '\n=== Non-destructive local SQL assertions (requires local Supabase Docker) ===\n'
DB_CONTAINER="$(python3 -c 'import sys;sys.path.insert(0,"scripts/phase3");from local_db import verify_local;print(verify_local())')"
EXISTS="$(docker exec "$DB_CONTAINER" psql -X -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c \
 "select count(*) from supabase_migrations.schema_migrations where version='20261025120000'")"
[[ "$EXISTS" == '1' ]] || { echo 'P9 migration #18 is NOT applied locally; no SQL check can pass' >&2; exit 1; }
docker exec -i "$DB_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/p9_local_calendar_identity.sql
printf '\nP9 LOCAL CODE + SQL ACCEPTANCE: PASS (not hosted/mobile acceptance)\n'
