# Puzzle League — Authoritative Project Guide v3.29 (FINAL POLISHING SOURCE CANDIDATE)

**23 October 2026 · owner scope APPROVED 21 October · source changes prepared on `feat/polishing-integrated-20261023`.**

This guide supersedes older guide narratives for **implementation scope and test evidence**, but it is **not a statement of production release acceptance**. Promote it to the active production guide only after remote migrations, deployed runtime, current backup/recovery and the consolidated owner UAT are evidenced. The last originally committed on-disk guide was v2.9; v3.25–3.28 were source-branch candidate guides.

## Baseline and immutable contract

- Owner-confirmed clean original Ubuntu repository: `~/Desktop/Development/Puzzle_League`, `main` at `267da00` (Cloudflare native SPA fallback), `origin/main` matched at that checkpoint.
- Private Git remote: `Cupitum/puzzle-league`. Pilot: `https://puzzle-league-pilot.pages.dev/`; Supabase project ref: `jwmqhnorcwtgcoqisffh`.
- October 21 hosted baseline reported 13 migrations, 21 RLS app tables, 4 Auth users/profiles, 2 leagues, 16 submissions. Six separate local historical pending results were **not** imported and must remain separate.
- Frozen: approved five-game catalog, all official rule versions and scoring logic, original shares, duplicate/season/join/48-hour eligibility and independent reviewer rules. Never self-approve, auto-backfill historical awards or widen private league boundaries.
- All 13 baseline migrations remain byte-identical. Three ADDITIVE proposed polishing migrations: `20261023100000` protected roles/deletion, `20261023100100` awarded-day streak, `20261023100200` independently sourced daily identity evidence. **16 total only if all are actually applied**; as of source packaging, zero new migrations have been applied to production.

## Completed candidate features

**UX:** separate Find Leagues/My Leagues; task-first selected-league dashboard (Members, Review Queue, Invitations) and collapsed advanced panels; accessible compact mobile Home game cards with native formats, status, server-awarded-day streak or unavailable, official game links, independent Share Result, expandable explanation; Today results above filtered past submissions; deterministic default Rankings league/season with user override; action-adjacent status messages. Retain original Android Share Target, manual paste/drafts and persistent sign-in.

**Permissions:** owner and active moderator roster only for their league, owner row included once, username/UUID and effective access; new moderator's roster access is implicit, all other moderator powers OFF until owner grants them; invitation/ordinary-member grants scoped, audited, revocable; review delegation remains independent; owner alone promotes/demotes moderators. Direct app role changes remain guarded by existing `set_league_moderator` RLS/RPC. Cross-league and no-self-approval rules unchanged.

**Data:** server-derived verified awarded-day streak (unknown != zero), reviewer-only historical pending evidence suggestions, protected verified account deletion request status, immutable admin audit, no actual deletion or new admin dashboard. Emailed-code password recovery **explicitly deferred** pending external deliverability and secure replay-resistant verification.

**Identity:** code for five independent game-specific rule contracts, operator-only protected evidence registration, immutable provenance and time-limited reference lookup, Edge fail-closed source lookup and new-share-only automatic submission path when independently verified; reviewer-only historical evidence. For Wordle requires published number; Minute Cryptic also verified clue/date; FoxiMax original /8; Polygonle standard 6–8-letter /6 + matching published pattern; Krillion true Daily Dive and 0–700. No universal +1 or date-from-clock logic. Read `docs/POLISHING_OPERATOR_EVIDENCE_AND_REVIEW.md` before any evidence entry.

## Actual technical verification evidence (distinguish scope)

- Owner terminal output: previous grouped application + real local Auth/JWT/PostgREST passed. Four synthetic GoTrue signups/sign-ins, signed JWT subjects and tampered token denial, private league roster, moderator default denial/grant/revocation, owner-only promotion/demotion, real RLS and protected deletion-request reauth all PASS. This was **not a deployed Edge runtime**.
- Owner terminal output: Oct 21 five-file backup restored to isolated DB with 4 Auth users/4 identities/4 profiles, 2 leagues, 16 submissions/13 migrations; foreign keys and profile relationships PASS. Missing Auth signup/profile trigger was rebuilt in isolation from hash-verified Phase 3 source. A single Supabase Realtime parameter grant was omitted in the isolated copy. These exceptions remain recovery parity limitations.
- Owner terminal output: both earlier candidate polishing migrations executed on restored historical data with role-matrix checks in a rolled-back transaction; production unchanged.
- Final source package adds a **third** migration and identity resolver: unit/mock tests run in packaging environment, but actual 16-migration local SQL and real signed-JWT Edge integration must be rerun on Ubuntu after applying this package. Never imply that historical 15-migration evidence proves migration #16.
- Not established: live hosted migration list and full production backup restore current as-of-deploy, restored-user password authentication, Supabase hosted Realtime privilege/Storage/cron/SMTP/Edge/Cloudflare configuration recovery, actual deployed Edge gateway/RLS end-to-end, authoritative official source feeds for five games, mobile PWA owner UAT and external email-code verification.

## Deployment boundary

Follow `docs/POLISHING_SINGLE_RELEASE_RUNBOOK.md`. The single grouped development gate runs offline tests and disposable local GoTrue/DB/REST. Do not deploy directly from a source ZIP, merge to main, run `db push` or update Cloudflare without release-gate evidence, verified source identities, protected rollback and explicit production change authorization. Stage new function/schema where possible and prove negative role matrix, then guarded production with read-only afterchecks. One owner UAT gate thereafter; Step 12/third external email/wider 5–10 pilot remain paused until owner acceptance.

## Operational notes

- No live app credentials, passwords, refresh tokens, private invitations or user shares in versioned files or support output.
- Manual platform admin deletion register review daily through protected console; privacy/retention approval before first irreversible deletion.
- UI native results never use championship points; rankings include only actual immutable recorded league awards.
- `scripts/polishing/complete_polishing_local_gate.sh` is one consolidated internal test; it never deploys.
