# Puzzle League — Project Guide v3.31 (Candidate, 23 October 2026)

**Status:** Integrated Polishing Phase implementation branch; NOT production-deployed or accepted.

## Authoritative baseline
- Production source originally at clean `267da00`, branch `main`; ongoing development branch `feat/polishing-integrated-20261023` with uncommitted candidate changes.
- 13 original migrations preserved byte-for-byte, with three candidate polishing additions `20261023100000`, `20261023100100`, `20261023100200` (total **16 proposed**, NOT proved hosted).
- Hosted target Cloudflare Pages + Supabase remains unchanged; no permission to reset or delete live data.
- Existing historical scoped hosted PASSes stand, but not as current release acceptance.

## Current local engineering and recovery proof
- Source candidate includes owner-controlled roster/moderator delegation, local feedback, mobile-first Home, My Leagues and Find Leagues, Rankings default, My Results summary, manual platform-admin deletion request, protected pending evidence suggestions and fail-closed five-game identity reference matching.
- On 23 October owner reported GoTrue-signed JWT, PostgREST/RLS, default-deny and revocation tests passed in a disposable synthetic stack before identity migration introduced.
- Historical Oct 21 backup application+Auth data restored in isolation with FK/count checks. One Realtime parameter grant parity unproved and original Auth-to-profile trigger absent in restored image; trusted Phase 3 source used to recover the trigger in sandbox. Real restored login, platform service configuration and complete disaster recovery not yet proven.
- Integrated final candidate tests had all offline checks pass but real-local operator registration returned PostgreSQL `2201B` after synthetic users/leagues were created.

## SQLSTATE 2201B fix
- Root cause confirmed in source: regex bounded repetition `{4,500}` exceeds PostgreSQL max 255.
- Both unshipped occurrences replaced with PostgreSQL-valid non-whitespace expression plus explicit 12..508 character count, matching the intended 4..500 URL suffix.
- A new SQL transaction/ROLLBACK regression is executed by the synthetic real-GoTrue stack BEFORE operator registration; further guards added to output only sanitized test stages/SQLSTATE/HTTP status.
- See `docs/POLISHING_SQLSTATE_2201B_CORRECTION_AND_RELEASE_GATE_2026-10-23.md`.

## Locked contracts
- Frozen scoring, eligibility, duplicate prevention, original submissions and award history; no self-approval, no cross-league information leakage, owner-only moderator promotion/demotion, delegated powers default denied.
- Historical pending suggestions ONLY; no automatic point awards or imports of six historical local pending submissions.
- Password-by-email-code remains conditional and deferred if unavailable; account deletion is a verified request plus protected manual administration, not immediate erasure.
- Maintain PWA OS Share Target, paste workflow, drafts and persisted login.

## Release rule
No new deployment or acceptance claim until combined Ubuntu local gate, server/RLS and real source evidence, restored Auth/platform recovery strategy and guarded hosted acceptance are checked. One grouped owner UAT, then only after acceptance resume deferred Step 12 and broader 5–10 player pilot.
