# Puzzle League — Polishing source candidate release notes

**Prepared:** 23 October 2026. **Not deployed. Not UAT accepted.**

### Included

React/UX (carried from the prior working candidate): vertical Home cards, native result, Play Game link, separate Share Result, expanded eligibility detail; Find Leagues and My Leagues; top task actions and collapsed advanced season controls; Today before Past Submissions; alphabetical league/active season Rankings initial selection; scoped accessible action feedback.

Backend candidate (new this pass): protected `p7_polishing` service-role-only Edge RPC and league roster (nickname, full UUID, role, effective permissions including owner without a membership row); new owner-controlled, default-denied invitation and ordinary-member grants, existing owner-only moderator role changes and separately delegated review; reviewer-only read-only hosted pending suggestions with source fingerprint; verified awarded-day streak or null; verified, rate-limited account-deletion request register with immutable manual-administrator status audit. No automatic account deletion or new platform-admin dashboard.

### Preserved

13 applied baseline migration files, `p4_points`, `p4_award`, review/approval requirements, immutable original shares, no-self-approval, score entries, 48-hour ordinary window, per-league eligibility, game modes, PWA Share Target, manual paste and session persistence. The six historical **local** pending results are not imported, read or modified. The hosted pilot and existing 21 Oct PASS evidence have not been modified.

### Deferred / release blockers

Independent official five-game daily identity source verification/cross-check remains missing; unverified identities still pend. Email-code password recovery lacks external SMTP and Auth proof and remains disabled. Production SQL install and negative RLS/Edge tests, full npm dependency install/typecheck/Vitest/build, fresh data snapshot + complete isolated Auth restoration, remote migration reconciliation, Cloudflare deployment, user acceptance and privacy/retention approval all remain unproven. Do not deploy until guarded runbook is completed.
