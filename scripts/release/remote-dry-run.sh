#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
[[ "$(git branch --show-current)" == 'main' ]] || { echo 'STOP: use main checkout' >&2; exit 1; }
[[ -n "${RELEASE_SUPABASE_PROJECT_REF:-}" ]] || { echo 'STOP: set RELEASE_SUPABASE_PROJECT_REF privately' >&2; exit 1; }
[[ "${RELEASE_SUPABASE_PROJECT_REF}" =~ ^[a-z0-9]{20}$ ]] || { echo 'STOP: invalid Supabase project ref' >&2; exit 1; }
ref_file='supabase/.temp/project-ref'
[[ -f "$ref_file" ]] || { echo 'STOP: link this repo to your intended managed project first' >&2; exit 1; }
actual="$(tr -d '\r\n' < "$ref_file")"
[[ "$actual" == "$RELEASE_SUPABASE_PROJECT_REF" ]] || { echo 'STOP: linked project DOES NOT MATCH expected ref' >&2; exit 1; }
[[ "$(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l)" -eq 17 ]] || { echo 'STOP: migration source count changed' >&2; exit 1; }
[[ -z "$(git diff --name-only -- supabase/migrations | grep -v -E '(20261023100(00|100|200)_polishing_|20261024170000_polishing_)' || true)" ]] || { echo 'STOP: protected baseline migration edited' >&2; exit 1; }
[[ "$(find supabase/migrations -maxdepth 1 -name '*.sql' | grep -E '(20261023100(00|100|200)_polishing_|20261024170000_polishing_)' | wc -l)" -eq 4 ]] || { echo 'STOP: unreviewed candidate migration names' >&2; exit 1; }
echo 'READ ONLY: linked migration list (review target carefully)'
npx --no-install supabase migration list --linked
echo 'READ ONLY: managed migration dry run (NO apply)'
npx --no-install supabase db push --dry-run --linked
echo 'PHASE 6 REMOTE MIGRATION PREVIEW COMPLETE: REVIEW REQUIRED, NO DB PUSH EXECUTED'
