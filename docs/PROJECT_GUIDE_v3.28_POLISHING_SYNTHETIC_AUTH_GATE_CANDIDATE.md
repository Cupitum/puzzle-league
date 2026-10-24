# Puzzle League — Project Guide v3.28 (Polishing synthetic Auth integration CANDIDATE)

**Prepared 23 October 2026. Implementation branch ONLY, not the adopted production guide.**

## Verified baseline and owner scope
- Repository `~/Desktop/Development/Puzzle_League`, `267da00` source baseline; latest original on-disk guide `v2.9_PHASE4_PREPARED`.
- Current branch `feat/polishing-integrated-20261023`, original 13 migration files unchanged, two new proposed polishing migrations (15 total in test).
- Owner approved the final full P-01–P-25 Polishing scope and D-01–D-16 decisions on 21 October 2026. No reopening decisions, no scoring redesign.

## Verified milestones through owner terminal output
1. Complete local application suite, static Edge security handler tests and build PASS.
2. Clean disposable 15-migration SQL, deny/revocation permission tests PASS.
3. October 21 hosted backup checksum and structural Auth user/profile/identity audits PASS.
4. All five SQL backup components imported into a disposable DB; expected historical row counts/FKs PASS.
5. Auth trigger missing from backup restored only within isolated DB using hash-pinned Phase 3 code; real synthetic trigger behavior PASS.
6. Both proposed migrations and synthetic league role matrix against restored data PASS; no hosted mutation.
7. **Not verified:** complete role parity (one Realtime grant omitted in sandbox), sign-in of the four restored real accounts, current hosted state, deployed Edge, external email, authoritative five-game puzzle identity, full platform recovery.

## New work in this candidate
- `scripts/polishing/make_live_auth_config.py` creates a sanitized disposable local Supabase config.
- `scripts/polishing/local_live_auth_edge_gate.sh` starts a wholly synthetic local Auth+REST+DB Docker project and cleans up.
- `scripts/polishing/local_live_auth_edge.mjs` tests real GoTrue/JWT issuance, actual PostgREST and DB authorizations through exact Edge handler source, in-process.
- `tests/polishing-live-local-contract.test.mjs` validates runner safety/config.
- `scripts/polishing/run_grouped_live_gate.sh` runs existing full local suite and new live-local suite with one command.

**These new tests are not yet owner-executed.** Successful future execution must be documented with actual terminal evidence before status changes.

## Release and deferrals
Auto identity can only award when genuine independent game-specific identity/mode/date evidence exists; unavailable or ambiguous input remains pending. Historical pending evaluation never awards automatically. Emailed-code reset remains deferred until external SMTP verification and replay-resistant GoTrue support; do not substitute a self-issued OTP mechanism. Account deletion remains request + trusted manual administrator only, governed by approved retention/privacy policy.

Keep Cloudflare Pages URL and Supabase project identifiers unchanged, preserve PWA OS Share Target, manually pasted results, persistent session and original immutable scoring/history. One guarded deployment and one owner UAT, only after technical gates; Step 12 paused.
