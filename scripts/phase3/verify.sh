#!/usr/bin/env bash
# One consolidated owner-run acceptance, AFTER forward migration applied.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
trap 'echo "PHASE 3: FAIL (review the last failing gate; do not commit)" >&2' ERR
python3 scripts/phase3/preflight.py
DB_CONTAINER="$(python3 -c 'import sys;sys.path.insert(0,"scripts/phase3");from local_db import verify_local;print(verify_local())')"
VERSION="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c "select count(*) from supabase_migrations.schema_migrations where version='20261014150000';")"
[[ "$VERSION" == '1' ]] || { echo 'Migration not applied; run apply.sh first' >&2; exit 1; }
# Historical Block 1 assertion of *zero* public policies is obsolete after Phase3.
for sql in \
    supabase/tests/phase3_block2_step4_profile_checks.sql \
    supabase/tests/phase3_block2_step5_rls_read_checks.sql \
    supabase/tests/phase3_block2_step6_permissions_checks.sql \
    supabase/tests/phase3_final_sql_security_checks.sql; do
    echo "Running transaction-only $(basename "$sql")"
    docker exec -i "$DB_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$sql" > /dev/null
done
python3 supabase/tests/phase3_block2_step4_http_auth_test.py
python3 supabase/tests/phase3_real_jwt_http_security.py
python3 scripts/phase3/backup_restore_verify.py
npm run check
python3 scripts/phase3/package_integrity.py
python3 scripts/phase3/source_baseline_test.py
python3 scripts/phase3/static_tests.py

git diff --check
git diff --cached --check
printf '\nPHASE 3 CONSOLIDATED LOCAL ACCEPTANCE: PASS\n'
printf 'NOT VERIFIED: hosted GitHub Actions, managed Supabase and Cloudflare deployment\n'
