# Puzzle League — Project Guide v3.26 (implementation candidate, NOT deployed)

**Date:** 23 October 2026 (Africa/Johannesburg). **Status:** Polishing implementation in progress. Not accepted or production-deployed.

## Verified source baseline

User's Ubuntu terminal reported clean local `main`, `HEAD = origin/main = 267da00` (local tracking ref), with 13 migration SQL files and latest physically present repository guide v2.9. The v3.24 guide mentioned in handover does not exist in that on-disk list. The candidate was built from the 200-file source archive plus follow-up working candidate and the user-confirmed Git baseline. Keep old v1.8–v2.9 guides as historical documents and use this guide as **candidate operational record only**, not proof of a hosted deployment.

## Locked approved 21 October scope

Final approved `Puzzle_League_Polishing_Implementation_Spec_FINAL_APPROVED_2026-10-21.md` controls UX and security; no owner decisions reopened. Preserve the five frozen scoring policies, original shares, award ledger, per-league eligibility/window and private-league isolation, immutable events, no-self-approval and role separation. Step 12 remains paused through owner Polishing UAT acceptance. Six separate local pending results must never be imported automatically. The Oct 21 hosted export passed checksums; complete isolated restore and Auth recoverability remain OPEN.

## Candidate additions

- Compact Android Home cards, original-game links, independent Share Result, Today summary, split Find/My Leagues, collapsed advanced season panels, deterministic Rankings initial selection.
- New `p7_polishing` service-role-only wrapper behind validated JWT Edge: complete scoped owner/moderator roster (nickname, UUID, effective grants), owner-only granular invitation and ordinary-member permissions; newly promoted moderator receives roster only. Existing owner-only promotion and independent review delegation remain separate.
- Host-pending reviewer evidence dry-run; retains source SHA and verified puzzle metadata, creates no award. Server-derived awarded-day streak reports null rather than a false zero when unverified.
- Account deletion requests after fresh password verification, private audit/status and manual trusted platform-administrator process. No immediate deletion, no admin dashboard. Email-code password recovery explicitly deferred pending deliverability and Supabase code proof.

## Local test evidence

Available in this environment: 80/80 combined Node regression/static-contract tests (foundation, Phase 4, Phase 5, Phase 6, release, Polishing); 76/76 research Python; TSX/Edge transpile syntax checks with no syntax diagnostics. **Not run/passed:** complete `npm ci`/TypeScript typecheck/lint/Vitest/build, SQL migrations on isolated Supabase, full role denial/revocation suite, hosted UAT, Auth recovery, Cloudflare deploy. Dependency installation was not available. These static tests do not establish SQL correctness or authorization safety on a real database.

## Release gates

See `docs/POLISHING_PHASE_RELEASE_AND_RECOVERY_GATE_2026-10-23.md` for exact plan. Deployment is BLOCKED until isolated restores including Auth and hosted migration reconciliation are evidenced, new SQL and negative permissions are tested against disposable Supabase, full local build works, source is reviewed and owner explicitly accepts one UAT. No production changes made in this session; historical hosted scoped PASS evidence remains unchanged.
