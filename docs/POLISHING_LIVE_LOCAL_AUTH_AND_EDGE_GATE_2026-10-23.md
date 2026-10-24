# Puzzle League — integrated synthetic GoTrue/JWT/PostgREST + Edge-handler gate

**Status: Prepared, not run on the user's Ubuntu as of this package. No production operations.**

## Evidence carried forward
- `267da00` clean main and 13 original migrations confirmed by owner; polishing changes reside only on feature branch.
- Local candidate and 15-migration security suite PASS.
- October 21 historical five-file backup restored in an isolated scratch database; 4 Auth users, 4 identities, 4 profiles, 2 leagues, 16 submissions and 13 migration records, no orphan rows and FK audit PASS.
- Missing Auth signup/profile trigger had to be reconstructed from hash-verified Phase 3 source in scratch: **original backup does not prove trigger completeness**.
- One hosted-specific Realtime parameter privilege was omitted in scratch: **permission parity not proved**.
- Both candidate migrations on restored data and synthetic SQL role matrix PASS inside rollback.
- Latest targeted Edge tests: **30/30 PASS** (21 new + 9 previous); `npm run check`: 8 foundation, 76 research, 32 Vitest, TS, lint, build PASS.

## New combined gate

`bash scripts/polishing/run_grouped_live_gate.sh`

Runs the previous complete local security/build suite, then starts a **new and independent local synthetic-only** Supabase Docker project, with unique ports and a `127.0.0.1`-bound Docker bridge. Copies only migration SQL and a sanitized config (no production secrets or backup data). Disables external mail, Realtime, Storage and ancillary services. Local GoTrue email confirmations are disabled intentionally for `example.invalid` synthetic identities; this **does not** test real email verification.

The gate obtains freshly generated local API keys only from `supabase status -o env` into a private mode-600 local file. All HTTP targets are checked to be `http://127.0.0.1:<port>`; private tokens and SQL are never printed. The real `competition/index.ts` handler is evaluated in-process with **real** local GoTrue and PostgREST HTTP `fetch` responses, not simulated ones; its parser is stubbed because the security calls do not involve game results. The handler itself is **not deployed to an Edge runtime** in this test.

The runner provisions four synthetic users via live local GoTrue signup, obtains actual signed JWT access tokens using password grants, validates token subjects, creates two synthetic private leagues via disposable SQL, then tests:

- Unauthenticated/forged token rejection before privileged calls.
- Direct user-JWT PostgREST invocation of service-role-only `p7_polishing` denied.
- Owner+moderator roster access; ordinary member, cross-league owner and outsider denied.
- Moderator has no invitation/member power by default and cannot self-grant; owner explicitly grants and revokes invitation ability, with immediate effects.
- Owner alone promotes/demotes; newly promoted moderator obtains roster only; demotion revokes roster.
- Actual RLS rejects anonymous and cross-league roster table reads.
- Verified-password synthetic account-deletion request records securely with own-status-only visibility, duplicate/incorrect-password denial and no deletion action.

Run without imported user/backup data. The disposable stack is stopped on exit, and private logs stay in `~/Desktop/Puzzle_League_Local_Auth_Edge_XXXXXXXX/` with restrictive permissions. Do not share these logs or local keys.

**Pass criteria:** `GROUPED LOCAL APPLICATION + REAL AUTH/JWT/POSTGREST GATE PASS.` **Failure:** a sanitized `BLOCKED` message; never force grants or use production identities to make a test pass.

## Remaining mandatory gates, even if this test passes
1. Actual deployed Edge runtime / gateway JWT integration in wholly private synthetic staging, with owner/moderator/member/outsider permissions and revocation.
2. Per-game independently validated official identity evidence, reset-timezone/mode tests, source-outage fail-closed behavior, and reviewer-only historical pending recommendations. **Automatic puzzle identity is currently incomplete.**
3. Current production migration reconciliation, fresh backup, complete restore re-run; Auth session/password recovery, Realtime role privilege parity, Storage/cron/Cloudflare/Supabase configuration capture, rollback plans and breach containment.
4. Hosted Brevo/Supabase email-code recovery deliverability and replay-resistant code challenge or **explicit deferral**; the existing native safe account recovery must remain available.
5. Manual deletion request admin handling, owner-league resolution, retention/privacy approval and trusted administration notification. No automatic erasure or platform-admin dashboard.
6. Release security regression and accessible mobile/Desktop/PWA Share Target; then **one consolidated owner UAT**, and only then Step 12 and 5–10-player pilot.

**Never push the candidate or run live migrations merely because local tests pass.** No automatic historical points/backfills, source edits to old migration files, live resets, deletion or imports of six local pending results.
