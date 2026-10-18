# Phase 6 — Historical Polygonle #1539 parser-only recovery

**Source anchor**: `4f96c44` (Git, clean/pushed before reconciliation changes). Migration 12 was applied and its synthetic rollback security test passed on the owner's Ubuntu VM. The **three actual Polygonle rows have null `puzzle_id`**; migration 12's existing guard correctly rejects unidentified submissions. This package adds a new, narrowly scoped function in **migration 13** rather than editing an already-applied migration or weakening its existing guard.

## Scope and safety contract

- **Exactly three** existing pending Polygonle shares that parse as #1539, with `puzzle_id IS NULL`, one existing review request each, no awards, no decisions and no previous reparse event.
- Source-pinned parser SHA-256 `01a49b51301cd8322de2a79d690b08dcf1a041e1790462ab98b04e43a822a7e4`; rerun the current trusted JavaScript parser on the original raw text. Validate six-attempt standard-compatible 6–8-cell grids. Never derive dates, modes or external authenticity.
- Write only `result_submissions.parser_version`, `parse_status='needs_review'` and `parsed_fields`. Preserve raw text, account, game, `puzzle_id=NULL`, `review_status='pending'`, original review requests and decisions, all scoring versions and historical awards.
- Insert **one immutable `p6_pending_reparse_events`** row and one `competition_events` record per real reparse. Admin-only, single DB transaction with strict hash/parser/old fields preconditions; zero prior award history or decisions permitted. Aborts and rolls back all three if any condition fails.
- **No results approved or scored**; mode/date/official daily identity remain **UNVERIFIED** and require a separate future approval and puzzle-link process. The private report should stay off Git and out of public chats.
- Owner's previous backup/restore passed across 20 RLS tables and 10 data fingerprints. Repeat before the new migration and real writes. Only local Supabase Docker, never production.

## Installation

Extract ZIP on Desktop **outside** the repository. From extracted directory run:

```bash
bash INSTALL_TO_REPO.sh "$HOME/Desktop/Development/Puzzle_League"
```

Check that the five additions-only files were installed; existing local modifications from the Phase 6 stage are not overwritten. Run author-side tests:

```bash
cd ~/Desktop/Development/Puzzle_League
node --test scripts/phase6/tests/polygonle-recover.test.mjs
node --check scripts/phase6/polygonle-recover.mjs
```

## Read-only preview (migration 12 still active)

```bash
cd ~/Desktop/Development/Puzzle_League
export PL_RECONCILE_OUT="$HOME/Desktop/Puzzle_League_Backups/phase6_reconciliation"
node scripts/phase6/polygonle-recover.mjs --plan
```

The private `polygonle_1539_private_plan.json` contains individual submission IDs, original parser metadata, hashes and proposed fields, **not** the original share text. Keep it mode `0600` inside a `0700` directory. It should report 3/3 recoverable. Failure here means stop rather than modifying real submissions.

## Protected migration and real application

The plan must pass before running this block. Fresh recovery verification is required. **Stop on any failure** and do not retry a partially applied migration blindly. Set a non-sensitive operator label (do not use an Auth password/secret).

```bash
cd ~/Desktop/Development/Puzzle_League
(
  set -euo pipefail
  export PUZZLE_PHASE3_BACKUP_DIR="$HOME/Desktop/Puzzle_League_Backups/phase6_pre_reparse"
  mkdir -p "$PUZZLE_PHASE3_BACKUP_DIR"
  chmod 700 "$PUZZLE_PHASE3_BACKUP_DIR"
  python3 scripts/phase3/backup_restore_verify.py
  npx --no-install supabase migration up --local
  DB_CONTAINER=$(docker ps --filter name=supabase_db --format '{{.Names}}')
  test "$(printf '%s\n' "$DB_CONTAINER" | wc -l)" -eq 1
  docker exec -i "$DB_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 \
    < supabase/tests/phase6_unlinked_polygonle_rollback.sql
  export PL_RECONCILE_OUT="$HOME/Desktop/Puzzle_League_Backups/phase6_reconciliation"
  export PL_OPERATOR_LABEL="Puzzle League owner"
  export PL_BACKUP_RESTORE_PASS=YES
  node scripts/phase6/polygonle-recover.mjs --apply --confirm POLYGONLE-1539-PARSER-ONLY
  node scripts/phase6/polygonle-recover.mjs --verify
  node --test scripts/phase6/tests/polygonle-recover.test.mjs
  bash scripts/phase6/verify.sh
  echo "PHASE 6 POLYGONLE PARSER-ONLY RECONCILIATION LOCAL GATE: PASS"
)
```

The `PL_BACKUP_RESTORE_PASS` flag is a deliberate operator acknowledgment, **not** proof by itself; the preceding backup-and-isolated-restore script is the actual gate. The private plan is checked against a fresh database read before applying. No remote CI, HTTPS or pilot claim is made. The `verify.sh` script is still a read-only report and can print 0 parser-only candidates after reconciliation; that's expected.

**If the migration applies but the guarded apply fails:** Leave migration 13 in place, retain the backup and private plan, investigate why the preconditions failed. Do not run `supabase db reset`, manually manipulate audit tables, or rerun the full block without determining which step already completed. If all three database writes committed but a later test fails, do not rerun `--apply` (it is deliberately non-idempotent); use `--verify` and troubleshoot the failed test.

## Source-control and release scope

After locally verified PASS only: check `git diff --check`, `git status --short --branch`, `git diff -- scripts/phase3/backup_restore_verify.py` and exact changed files. The existing Phase 6 fixes and Phase 3 restore repair are currently uncommitted and must be reviewed with the owner before committing/pushing, with no secret data, dumps, `node_modules` or private plans tracked. Do **not** declare Phase 6 release complete: independent game-mode/date evidence, production Supabase/Cloudflare/hosted CI, real HTTPS installed Android share, and real pilot remain unverified.
