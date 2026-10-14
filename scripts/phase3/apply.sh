#!/usr/bin/env bash
# Non-destructive, local-only database migration application.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
trap 'echo "PHASE 3 APPLY: FAIL; no destructive reset attempted" >&2' ERR
python3 scripts/phase3/preflight.py
python3 scripts/phase3/source_baseline_test.py
python3 scripts/phase3/static_tests.py
# Back up the complete pre-change database; the separately verified restore
# happens in the consolidated end-of-phase command after migration.
python3 scripts/phase3/backup_restore_verify.py --backup-only
npx --no-install supabase migration up --local
DB_CONTAINER="$(python3 -c 'import sys;sys.path.insert(0,"scripts/phase3");from local_db import verify_local;print(verify_local())')"
N="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c "select count(*) from supabase_migrations.schema_migrations where version='20261014150000';")"
[[ "$N" == "1" ]] || { echo 'New migration not registered; STOP' >&2; exit 1; }
echo 'PHASE 3 LOCAL FORWARD MIGRATION: APPLIED; execute verify.sh for acceptance'
