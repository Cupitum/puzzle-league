# Phase 3 consolidated completion — source at 1e9f216

**Status: PREPARED, NOT TESTED on the owner Ubuntu VMware database.** This package contains **one forward-only migration** and local-only test/recovery tooling. It does **not** accept or award puzzle results, implement scoring/league joining/seasons, or deploy an app. The 35 research hashes and original four migrations must remain unchanged.

## What changes

- `20261014150000_phase3_security_audit_infrastructure.sql`: private server-only approval requests/decisions and immutable event history; audit triggers on result submissions, role changes, moderator delegation, and approval activity. No new `public` result or score RPC, no role permission escalation. Audit payloads deliberately exclude raw share text, email, and parsed fields. These tables are infrastructure; do not submit a real approval decision until Phase 4 includes a trusted, permission-checked workflow and resolves owner-self-review handling.
- `phase3_final_sql_security_checks.sql`: current-schema security test, immutable raw share/decision/audit and uniqueness assertions. Existing Phase 3 Block 1 test assumes zero RLS policies and is HISTORICAL; it **must not be run against the final Phase 3 database**. Step 4/5/6 SQL regression suites are still exercised.
- `phase3_real_jwt_http_security.py`: disposable, independently signed-in Auth users; actual PostgREST public/private/roster RLS and moderator RPC tests, permission-denied writes and hidden private objects. Uses the local anon key only; does not use or display the service-role key. Test users/leagues/memberships are cleaned up; immutable UUID-only audit breadcrumbs of role/delegation changes intentionally remain for accountability.
- `scripts/phase3/backup_restore_verify.py`: saves a complete local database `pg_dump -Fc` to a chmod-700 private folder and verifies a second application-schema dump by restoring to a **fresh random disposable database** in the *same local Docker Postgres cluster*. Compares row count and canonical hashes for all ten app tables, and checks RLS/grant metadata. For the clone only, `auth.users` is represented by a UUID-only dependency stub; **this is not a test of managed Supabase Auth/Storage disaster recovery**. Full local archive is retained as recovery material; make it encrypted/off-host for true resilience.
- `preflight.py`, `apply.sh`, `verify.sh`, `package_integrity.py` plus this runbook.

## Scope and safety

* Working copy must be the **existing real Git repository** (with its `.git` history), at exact commit `1e9f216577b116d05d2cda924ba3651b5efbc820`, clean before package application. The ZIP contains **additions only**. Never overwrite existing migrations, run `db reset`/`migration down`, `git reset --hard`, or apply migrations against a cloud/linked database in this phase.
* Work on the owner Ubuntu VMware VM, local Supabase CLI **2.120.0**, local Docker network `puzzle-league-local`, local DB container matching `supabase/config.toml`; keep API bound to VM localhost. `npx --no-install supabase status -o env` has secrets: **do not paste that output**.
* Require `git`, `node`/`npm`, `python3` >=3.11, `docker`, `psql` installed **inside the running Supabase DB container**, and an active local Supabase stack. Keep a private backup directory **outside the repository** with adequate free disk and filesystem protections. PostgreSQL backups contain sensitive Auth hashes; never upload, commit, or print their contents.
* Backups and migration are fail-fast but cannot make changes that already ran magically atomic across shell steps. If a migration or backup fails, stop, preserve logs/backup and check the registered migration history before any repair. Do **not** replay the entire migration manually without assessing partial state.

## Operator procedure (one phase package, one acceptance gate)

1. Extract the package **outside** the current repo. Run `bash APPLY_TO_REPO.sh /home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e` from the extracted package directory. It checks the true Git commit/clean tree, existing-file collisions and adds files only. It does not create a Git commit.
2. On the Ubuntu VM, from the existing repository root, run:

   ```bash
   bash scripts/phase3/apply.sh
   ```

   This confirms the four earlier migrations, creates a **full pre-change DB backup without dumping secrets to the console**, then applies **only pending migrations** with `npx --no-install supabase migration up --local`. It never resets the working DB. If it stops, diagnose before retrying.
3. At the **end of this phase**, run exactly one consolidated acceptance command:

   ```bash
   bash scripts/phase3/verify.sh
   ```

   The harness exits immediately on any failing subtest. It runs SQL rollback tests, original local HTTP Auth smoke, actual signed-JWT PostgREST/RPC security, app-schema backup/isolated restore, complete `npm run check` (8 Node + 76 Python + 9 Vitest, TypeScript/lint/build expected baseline), 35 research hashes and Git diff hygiene. Capture only the final PASS/FAIL and sanitized diagnostic snippets. **NEVER upload unredacted credentials, backup archives, or raw project DB snapshots.**
4. Verify `git diff --check`, `git status --short --branch`, `git diff --no-index /dev/null <new-file>` for relevant files; inspect added SQL and scripts, check `git diff --cached --name-only` after staging and scan for secrets. Only after a genuine acceptance PASS, `git add` the listed new files (not backups), `git diff --cached --check`, `git commit -m "feat: complete Phase 3 security audit and recovery"`, `git push origin main`, check `git status --short --branch`. GitHub Actions must be checked by its actual result; pushing is not a CI PASS.

## Known limitations and recovery

- **No database/runtime is available inside the authoring environment.** Python compile, shell parsing, manifest preservation and the baseline research/offline suites may be run here, but real migrations, SQL assertions, JWT policies, recovery and application build require the owner's local runtime. Until then this package is PREPARED/NOT VERIFIED.
- The isolated restore is an application-data/permissions restore rehearsal inside the local PostgreSQL server, not an independent physical machine, managed Supabase full-platform restore, point-in-time backup or off-site DR. A separate preserved full database backup is taken; check free space and backup retention yourself.
- If restore fails, it intentionally leaves only the randomly named `phase3_restore_...` **test database** for diagnosis; never drop the main `postgres` database. Investigate before removing an isolated clone.
- If migration partially applies, preserve DB and backups; inspect `supabase_migrations.schema_migrations`, `pg_tables`, and logs in the owner's VM. Do not execute a blind rollback/reset. New correction should be a new forward migration, not an edit to this migration once applied.
- There is **no approval activation or owner-self-dispute procedure** in Phase 3; Phase 4 must implement authenticated authorisation and auditable decision transitions before awarding results. Audit tables are immutable to normal DML, not immune to superuser/DB-owner break-glass changes.
- Direct app-client writes remain closed. No managed Supabase, Cloudflare Pages, production auth, result ingestion, real user scores, Android share target or pilot is claimed.

## Exit record

Fill these in ONLY from actual owner output: migration registered ___; SQL security suites ___; Auth HTTP smoke ___; real-JWT HTTP/RPC tests ___; isolated DB restore ___; `npm run check` ___; research manifest ___; stage review ___; Git commit ___; GitHub remote ___; remote CI ___. **Phase 3 verdict: OPEN until all local exit gates truly PASS.**

Official operational references checked at packaging time: [Supabase CLI local migrations](https://supabase.com/docs/reference/cli/introduction), [status env exports](https://supabase.com/docs/reference/cli/supabase-status), [backup/restore limitations](https://supabase.com/docs/guides/self-hosting/restore-from-platform).
