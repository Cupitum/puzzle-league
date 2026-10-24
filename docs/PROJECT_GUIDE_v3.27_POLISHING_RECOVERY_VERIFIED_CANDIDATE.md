# Puzzle League Project Guide v3.27 — Polishing Recovery Verified (CANDIDATE)

**Recorded 23 October 2026. Not a deployed or approved release.**

This guide supplements v3.26 candidate, reflecting actual owner-run isolated database recovery and role tests. It does **not** replace the baseline v2.9 guide on `main` until release approval and commit. The owner-approved October 21 final implementation specification controls the scope.

## Working source and hosting
- Local Ubuntu VMware: `~/Desktop/Development/Puzzle_League`.
- Clean demonstrated base: `267da00`, private `Cupitum/puzzle-league`, branch `main`; development work on `feat/polishing-integrated-20261023`.
- Hosted Cloudflare Pages: `https://puzzle-league-pilot.pages.dev/`; Supabase project reference `jwmqhnorcwtgcoqisffh`.
- At October 21 backup: 4 users, 2 leagues, 16 hosted submissions, 13 migrations. Six old local pending submissions are a **separate** dataset.
- Proposed polishing migrations: `20261023100000_polishing_permissions_and_requests.sql`; `20261023100100_polishing_verified_streak.sql`. They have been applied in a disposable environment only, not on production.

## Latest test evidence
- Source candidate passed owner local gate (Node 80, foundation 8, Python 76, Vitest 32, TypeScript, lint, Vite build), plus roster alias regression tests.
- Isolated initial 15-migration/role suite passed with synthetic principals and grant/revoke tests.
- October 21 snapshot **successfully restored** in disposable PostgreSQL. Auth counts, application counts and referential checks passed; trusted original Phase 3 profile trigger was recreated as a missing backup-side object in sandbox.
- Both polishing migrations and synthetic role-matrix tests passed in rollback-only transaction against the restored historical data.
- One Realtime parameter GRANT was omitted from sandbox copy. This is a known permission-parity difference, not a production fix.
- Added offline mocked Edge handler security regression tests, not a substitute for real JWT/Edge tests.

## Release blockers remain
Five-game independent identity proof; complete Auth/platform disaster recovery and actual restored sign-in; a synthetic real-GoTrue/Edge JWT auth and no-self-approval/role matrix; external SMTP code reset capability; account deletion operational notification and retention policy; fresh production inventory and backup; guarded staged rollout; one owner acceptance pass. Broader Step 12 still paused.

Read `docs/POLISHING_VERIFIED_RECOVERY_AND_RELEASE_LEDGER_2026-10-23.md` for the exact verification evidence and restrictions. Do not modify scoring or retroactively award pending results.
