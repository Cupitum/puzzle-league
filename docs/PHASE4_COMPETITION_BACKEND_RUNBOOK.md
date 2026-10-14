# Puzzle League — Phase 4 Complete Competition Backend

**Status of this package:** PREPARED / NOT VERIFIED on owner Ubuntu VMware. Target source is Git `9b5a40a56b4f4cf3ad71f765fc913e3e94ed02d4`. Phase 3 remains PASS locally. **No new production, player or hosted acceptance is asserted.**

## Intended output

Forward-only migration `20261015100000` adds league invitations, protected review delegation, calendar/rolling season snapshots, next-season amendments, component score entries, corrections and immutable competition events. `20261015100100` provides narrowly privileged database functions and the `p4_dispatch` transactional entry point. `20261015100200` schedules idempotent five-minute maintenance where local `pg_cron` is already present; the final acceptance **fails** rather than claiming automatic renewal when maintenance is unavailable. No existing migration, Phase 1 Python file or prior audit table is edited.

`supabase/functions/competition/parser.mjs` ports the five researched share grammars. `index.ts` handles the signed-in Edge API, validates bearer JWTs against local Supabase Auth, discards caller-supplied scores, and calls `p4_dispatch` using the Edge-only service-role key. The unauthenticated exception is **read-only public standings**; private seasons remain filtered by the database. The Phase 4 installer adds `[functions.competition] verify_jwt = false` to the tracked local Supabase configuration **so the handler can independently validate JWTs**; anonymous writes are rejected. Do not expose the service-role key through React, a `VITE_` variable, documentation, or Git.

### Supported server actions

All requests are JSON `POST /functions/v1/competition` with `{"action":"...","data":{...}}`. Except public standings, send `Authorization: Bearer <current_user_access_token>`.

| Action | Data keys | Authorization / result |
|---|---|---|
| `update_profile` | `nickname` | User updates public nickname; no email/login copy |
| `my_leagues` | none | Owned and active-member leagues, filtered |
| `season_list` | `league_id` | Public league seasons or private current-member seasons |
| `review_queue` | `league_id` | Owner/delegated reviewer only; original share and correction proposal shown securely |
| `create_league` | `name`, `visibility`, `time_zone` | User becomes owner; returns league ID |
| `start_season` | `league_id`, `cadence`, `duration_days` for rolling, `games` array | Owner starts first season, freezes selected rule IDs |
| `schedule_games` | `league_id`, `games`, optional `target_sequence` | Owner; next season by default, or later |
| `invite` | `league_id` | Owner creates seven-day, one-use private join token |
| `invite_revoke` | `league_id`, `invite_token` | Owner revokes unused invitation |
| `join` | `league_id` for public, `invite_token` for private | User joins from actual time; history preserved on rejoin |
| `leave` | `league_id` | Member leaves; current delegations revoked |
| `remove_member` | `league_id`, `member_id` | Owner removes current member without erasing history |
| `suspend_member` / `unsuspend_member` | `league_id`, `member_id`, `reason` when suspending | Owner bans and controls rejoining |
| `report`, `report_queue`, `resolve_report` | League and report fields | Member filing; owner/delegated reviewer resolves independently |
| `delegate_review` | `league_id`, `member_id`, `enabled` | Owner may delegate review to an existing moderator |
| `submit` | `raw_text`, `method` (`paste`, `android_share`, `historical_import`) | Reparsed in Edge, checked in database, returns pending/duplicate/award count |
| `request_historical` | `submission_id`, `league_id`, `rationale` | User requests league-specific late award |
| `request_correction` | `submission_id`, `league_id`, `replacement_raw_text`, `rationale` | Server parses proposed replacement, creates immutable proposal |
| `review` | `request_id`, `decision`, `rationale` | League owner or delegated active moderator, **not the submitter/requester**; verified puzzle required before approval |
| `standings` | `season_id` | Public season anonymous; private season owner/active member; combined/game-specific competition ranks and separate longest streaks; nicknames only |
| `my_history` | none | Only own summary, latest 100 |
| `tick` | none | Idempotent maintenance trigger; automatic schedule still required |

**Member effective date:** puzzle day in each league's configured time zone must be on or after the join date, and before the local leave date. A single global submission may earn in multiple eligible leagues; membership remains historical. Deadline is **48 hours after the end of puzzle day**, computed with the league time zone. Pending results never award until an independent review and verified day/mode; older-than-window awards require separate historical exception approval **in each league**. Score corrections are approved and applied per league, preserving the original raw submission and immutable proposal; existing global score input is not rewritten.

**Official puzzle identity is a separate trust gate.** Number/date in pasted text is a candidate, never a certified puzzle date. Phase 4 deliberately has no crowd-exposed `verify_puzzle` action. The operator-only `app_private.p4_operator_verify_puzzle(game_id, identity_key, official_day, evidence_note)` must be run by a trusted local database operator **after verifying genuine published daily identity/mode/date from independent source**. The tests use explicitly synthetic fixture IDs that are rolled back or cleaned up; they MUST NOT be mistaken for authentic daily puzzles. FoxiMax, Polygonle and Krillion start review-only due to mode uncertainty. The existing Python POC remains research-only.

### Safe installation (existing Ubuntu Git repository)

1. Confirm the Git checkout remains at `9b5a40a` and clean. Extract the Phase 4 additions ZIP to a **separate** directory outside Git. Nothing replaces `.git` and no database dump belongs in the ZIP.
2. From extracted package root: `bash APPLY_TO_REPO.sh "$HOME/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e"`. The installer checks exact source commit, clean tree, manifest SHA-256 and existing-path collisions **before copying**, then appends one verified config stanza. If the configuration hash differs, stop and inspect. Never rerun the installer once files are installed; use Git status and the runbook instead.
3. `cd ~/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e` then `bash scripts/phase4/apply.sh`. Checks local DB and original migrations, takes a private off-repo backup using existing Phase 3 tooling, then runs non-destructive `supabase migration up --local`. No `db reset`, `--linked`, force-push or source re-init.
4. Run **once at the end**: `bash scripts/phase4/verify.sh`. This performs rollback-only SQL transaction tests, Node five-game/corpus tests, real local Auth/JWT HTTP tests, Edge/score/standings tests, a separate application-schema restore rehearsal, `npm run check` (research, offline, TS, lint, Vitest, build), source-hash and Git whitespace checks. It explicitly verifies pg_cron registration. The user provides the final consolidated output, not piecemeal per-file logs.

### Stop / recovery

If install preflight fails, stop without changing anything. If a migration fails, stop; DO NOT run `supabase db reset`. Preserve the private pre-change dump and examine the first SQL error, local migration history and table metadata. SQL migrations may be partially applied by transaction characteristics and should be reconciled before attempting a retry; do not modify applied SQL. Use the existing Phase 3 recovery procedure to test a restore in a **separate** database, never restore over the running local database automatically. If the HTTP gate fails, review the local Edge log inside the VM (redact secrets), distinguish migration/database from Edge runtime errors, and leave Phase 4 OPEN. If `pg_cron` is absent, the owner must decide/enable a trusted unattended scheduler; a callable `tick` alone does not meet automatic rollover acceptance.

The HTTP test creates three real disposable **local** Auth users, a private league, synthetic verified-puzzle fixture and a scoring entry; it removes only its own users/data and retains no raw test fixture outside tests, while append-only, non-identifying audit events remain. Verify this test runs only against localhost. Never use it against a managed or production database.

### Remaining gates/limitations

No real game-share authenticity system or independent official puzzle/date feed has been added. The first genuine 5-game pilot must not award unknown dated/mode puzzles. Daily mode for FoxiMax, Polygonle and Krillion cannot be inferred from share text alone, and Minute Cryptic share date is self-reported. Season maintenance needs verified pg_cron; production scheduler/hosting are Phase 6. Full account UX, share target, invite acceptance UI, history/moderation screens and Android testing remain Phase 5. Release security, hosted CI, backup rotation, production job health, rate limiting, anti-abuse operations and real pilot remain Phase 6. A local PASS is *not* evidence of remote readiness.

### Git closeout — **ONLY AFTER ACTUAL LOCAL PASS**

```bash
git status --short --branch
git diff --check
git add -- supabase/config.toml supabase/migrations/20261015100000_phase4_competition_schema.sql \
  supabase/migrations/20261015100100_phase4_competition_functions.sql \
  supabase/migrations/20261015100200_phase4_maintenance_schedule.sql \
  supabase/functions/competition/parser.mjs supabase/functions/competition/index.ts \
  supabase/tests/phase4_sql_acceptance.sql supabase/tests/phase4_http_acceptance.py \
  scripts/phase4 docs/PHASE4_COMPETITION_BACKEND_RUNBOOK.md \
  docs/PROJECT_GUIDE_v2.9_PHASE4_PREPARED.md
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
# Review every staged path for credentials, direct chat names, private dumps,
# generated caches or unintended modifications before proceeding.
git commit -m "feat: implement Phase 4 competition backend"
git push origin main
git log -1 --oneline
git status --short --branch
```

Do **not** run these commit commands if the verification gate fails. The owner must supply actual acceptance, final Git commit and remote status before an authoritative **Phase 4 COMPLETE** guide is issued for Phase 5.
