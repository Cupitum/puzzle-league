#!/usr/bin/env bash
# No resets, overwrites of applied migrations, source replacement or cloud operations.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
trap 'echo "PHASE 4 APPLY: FAIL / NOT VERIFIED; stop and inspect before retry" >&2' ERR
python3 scripts/phase4/preflight.py
python3 scripts/phase3/backup_restore_verify.py --backup-only
npx --no-install supabase migration up --local
python3 - <<'PY'
import sys
sys.path.insert(0,'scripts/phase3')
from local_db import psql,verify_local
verify_local()
registered=set(psql('select version from supabase_migrations.schema_migrations;').splitlines())
required={'20261012170000','20261013220000','20261013220100','20261013220200',
          '20261014150000','20261015100000','20261015100100','20261015100200','20261015100300'}
if not required.issubset(registered):raise RuntimeError('Not all Phase 4 migrations registered')
print('PHASE 4 LOCAL FORWARD MIGRATIONS: APPLIED (not yet accepted)')
PY
