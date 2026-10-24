# Puzzle League Project Guide v3.25 — Polishing implementation working baseline

**Status: DEVELOPMENT CANDIDATE ONLY — NOT OWNER ACCEPTED, NOT DEPLOYED.**

## Verified repository baseline (owner terminal evidence, 23 October 2026)
- `main`, clean; `HEAD=origin/main=267da00` according to local references (no network fetch evidence).
- 13 tracked Supabase migration files. No polishing migration has been applied or generated in this candidate.
- Existing newest repository guide is `PROJECT_GUIDE_v2.9_PHASE4_PREPARED.md`; v3.24 is not on disk.
- Production pilot: Cloudflare Pages `https://puzzle-league-pilot.pages.dev/`; Supabase ref `jwmqhnorcwtgcoqisffh`. **Current live state not verified here.**

## Owner-approved source of truth
21 October 2026 final polishing implementation specification and two accompanying handovers. All 25 issues and D-01 through D-16 owner decisions are fixed; this working guide does not supersede those requirements.

## This candidate's implemented code
- UI candidate: mobile Home cards; Today summary in My Results; Find/My Leagues split; League dashboard; existing roster UUID display; deterministic Rankings initial league and season selection.
- Isolated ranking selection test contracts added.

## Unmet production requirements
Evidence-based five-game auto identity, historical read-only reviewer recommendations, default-denied owner-configured moderator powers, full protected roster projection, server-derived streaks, deletion request register and manual admin auditing, and independently verified password-code recovery. None may be misrepresented as complete.

## Preservation
No scoring formula or official scoring version changed. No existing SQL migration modified. No hosted data, Auth users, local six pending shares, or awards modified. The pilot Share Target and persisted login code is retained.

## Safety release gate
1. Use isolated branch, review source diff, install locked dependencies, and run full checks.
2. Verify exact installed remote migrations/RLS and signed-in negative-permission matrix read-only.
3. Rehearse full isolated application restore; independently establish complete Auth recovery and other project configuration reconstruction. Backup checksums alone do not pass this gate.
4. Implement and test remaining backend contracts in one integration effort; no unverified auto-awards or permission bypass.
5. Only then guarded production deployment, record deploy SHA/migration history, one owner UAT; Step 12 stays paused until owner accepts.

## Evidence ledger
- 21 October legacy hosted PASS results remain **historical, scoped**, not new verification.
- This candidate's parser Node tests passed 6/6 locally in the isolated packaging environment.
- Current environment has incomplete npm dependency tree; TypeScript and Vitest cannot be reported PASS here.
- No hosted deployment or data recovery conducted.
