#!/usr/bin/env bash
# Local-only safety gate: no network/production operations are initiated by this script.
# npm ci is intentionally excluded; dependencies must already be installed by operator.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"
fail(){ printf 'BLOCKED: %s\n' "$*" >&2; exit 2; }
[[ -d .git ]] || fail 'Expected a Git working tree'
[[ "$(git branch --show-current)" == feat/polishing-integrated-20261023 ]] || fail 'Refusing to run outside polishing branch'
[[ -f tests/polishing-edge-boundary.test.mjs ]] || fail 'Edge transport tests missing'
[[ -f supabase/migrations/20261023100000_polishing_permissions_and_requests.sql ]] || fail 'Polishing permissions SQL missing'
[[ -f supabase/migrations/20261023100100_polishing_verified_streak.sql ]] || fail 'Polishing streak SQL missing'
[[ -f supabase/migrations/20261023100200_polishing_identity_evidence.sql ]] || fail 'Polishing evidence SQL missing'
[[ -x node_modules/.bin/vitest ]] || fail 'Dependencies missing; use npm ci separately after reviewing lockfile'
[[ "$(git rev-parse 267da00^{commit})" == "$(git merge-base HEAD 267da00)" ]] || fail 'Baseline commit 267da00 is not an ancestor of HEAD'
# All original SQL migration files must be unmodified relative to the known baseline.
if [[ -n "$(git diff --name-only 267da00 -- supabase/migrations | grep -Ev '20261023100000_polishing_permissions_and_requests.sql|20261023100100_polishing_verified_streak.sql|20261023100200_polishing_identity_evidence.sql' || true)" ]]; then
  fail 'One or more historical migration files changed'
fi
if [[ -n "$(git status --porcelain --untracked-files=no -- supabase/migrations | grep -Ev '20261023100000_polishing_permissions_and_requests.sql|20261023100100_polishing_verified_streak.sql|20261023100200_polishing_identity_evidence.sql' || true)" ]]; then
  fail 'Tracked migration modifications require audit'
fi
printf 'PASS: branch, baseline ancestry and frozen migration paths verified.\n'
git diff --check
node --test tests/polishing-edge-boundary.test.mjs tests/polishing-contract.test.mjs tests/polishing-identity-evidence.test.mjs tests/polishing-submit-resolution.test.mjs
npm run check
printf '\nLOCAL SECURITY AND APPLICATION GATE PASS — OFFLINE/MOCKED ONLY.\n'
printf 'NOT TESTED HERE: actual JWT signatures, live GoTrue, RLS/Edge integration, source identity feeds, SMTP, Auth restored sign-in, platform recovery, production.\n'
