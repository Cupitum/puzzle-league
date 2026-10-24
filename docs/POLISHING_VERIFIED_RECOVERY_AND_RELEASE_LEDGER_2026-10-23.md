# Puzzle League — Post-restore integration evidence and guarded release ledger

**Owner-approved implementation phase; evidence checkpoint 23 October 2026.**

## Exact source baseline
- Owner confirmed clean `main` at `267da00` (local `origin/main` also `267da00`; no fresh remote fetch evidenced); 13 existing migration files; newest baseline guide on disk v2.9.
- Integrated candidate on `feat/polishing-integrated-20261023`, with two new proposed migration files and the SQL roster-alias correction.
- No hosted migration, deployment or owner polishing UAT evidenced. No claim that a candidate guide is already authoritative on `main`.

## Verified in owner terminal output

| Gate | Evidence | Status/scope |
|---|---|---|
| Local candidate | 80 Node contracts + 8 foundation + 76 Python research + 32 Vitest; typecheck, lint, build | PASS local |
| Roster alias correction | reverse patch check, 9 targeted tests, `git diff --check` | PASS local |
| Disposable 15-migration stack | 13 original + 2 proposed; synthetic owner/member/moderator delegation, revocation and cross-league denial | PASS isolated |
| Original backup | 5 checksummed SQL files from October 21 | PASS integrity |
| Structural Auth | 4/4 password hashes; linked identities/profiles | PASS structure |
| Historical data restore | 5 SQL files in isolated DB; 4 Auth users, 4 identities, 4 profiles, 2 leagues, 16 submissions, 13 migration records; 0 orphan identities/profiles; FK audit | PASS isolated **data** restore |
| Auth profile lifecycle | Original Phase 3 trigger recreated in disposable DB from hash-verified source; synthetic signup/profile creation rolled back | PASS sandbox-only; baseline backup lacked trigger |
| Candidate SQL on restored data | Both candidate migrations + synthetic roster/delegation/denial/revocation, one rolled-back transaction | PASS isolated |
| Managed-role restore difference | One `supabase_realtime_admin` parameter GRANT excluded from disposable scratch copy | **Role parity open** |
| GoTrue Auth bootstrap | Empty local GoTrue catalog initialization; service stopped before loading real backup | PASS schema bootstrap only |
| Source-level Edge boundary | 21 offline mocked handler cases for identity, privilege and reauth transport | PASS local mock only; no real JWT proof |

**Recovery scope**: Data and foreign-key recovery are demonstrated for the dated October 21 snapshot. Original `auth.users` password hashes and identities were restored, but real sign-in using restored credentials was **not** demonstrated. SMTP, secrets, providers, Realtime grants, Storage, cron, Edge functions, Cloudflare configuration and backup recency remain unproven. Do not call this full production recovery.

## What remains missing before a deployable release

1. **P-16** five-game trusted daily identity feeds and cross-check evidence: Wordle, Minute Cryptic, FoxiMax, Polygonle, Krillion. Unverified or date/mode ambiguous identities must pend. No historical silent award.
2. **P-23** secure emailed-code recovery: external deliverability and replay-resistant Supabase workflow unverified. Keep code-recovery UI deferred and preserve existing safe fallback.
3. **P-23** manual deletion process: request registration supported in candidate; requires independent auth proof, secure platform administrator notification and approved retention/owned-league policy before any real deletion. Never auto-delete.
4. **Auth/JWT/Edge** negative and revocation tests must use a wholly isolated synthetic-identity Supabase environment with actual GoTrue, signed JWTs and PostgREST. The Edge mock tests alone do not satisfy this.
5. **Recovery**: complete platform configuration inventory and rebuild rehearsal, restored sign-in proof, Realtime grant parity, storage/cron/secrets/provider recovery instructions.
6. **Production guard**: fresh read-only remote migration/schema/checksum assessment; fresh private hosted backup and isolated re-restore; staging promotion with no real-data mutation; recorded Cloudflare + Edge rollback IDs; only then one owner UAT gate.
7. **Step 12** cross-league scoring, season rollover and larger 5–10 player pilot remain paused until explicit polishing acceptance.

## Release acceptance invariants
- Original 13 migrations, original shares, historical point awards, frozen scores, duplicate handling, league privacy, 48-hour window and no-self-approval untouched.
- Owner alone promotes/demotes moderators; new moderator only sees roster until specifically delegated a capability; review delegation is separate and default denied.
- No six local pending records imported. Historical hosted pending evidence is reviewer-only and does not award points.
- No live reset, live deletion, blind role creation, disabling RLS or importing privileged private logs into source control.

## Next grouped gate (synthetic-only)
Run `bash scripts/polishing/integrated_security_gate.sh` on the polishing branch; this repeats the local code/security checks without production access. Then set up **a wholly separate synthetic local GoTrue+PostgREST+Edge stack**, with no imported real users or sessions, to confirm real signed JWT validation, RPC authorization and immediate revocation across roles. The actual restore log is private and remains outside the repo. No deploy until all named blockers have documented evidence or explicit owner-approved scope deferral.
