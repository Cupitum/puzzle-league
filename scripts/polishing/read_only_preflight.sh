#!/usr/bin/env bash
# Safe preflight: prints metadata only. Never exports private rows or credentials.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
echo '=== Git branch/working tree ==='
git status --short --branch
echo '=== Commit and remote *local tracking reference* ==='
git log -1 --format='%h %s'
git rev-parse --short origin/main
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'STOP: worktree is not clean; preserve all changes before release' >&2; exit 3
fi
if [[ "$(git rev-parse --short HEAD)" == '267da00' ]]; then
  echo 'BASELINE: 267da00; polishing patch not installed'
else
  echo 'BASELINE: review change history before any live operation'
fi
echo '=== Migration filenames (NOT evidence of remote deployment) ==='
find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort
echo '=== Project Guides ==='
find docs -maxdepth 1 -type f -name 'PROJECT_GUIDE*' -printf '%f\n' | sort -V
echo 'Read-only preflight complete. No hosted backups, Auth or DB restoration checked.'
