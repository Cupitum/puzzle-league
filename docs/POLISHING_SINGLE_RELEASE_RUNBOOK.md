# Puzzle League — ONE integrated polishing release, engineering gate and owner UAT

**Release status: BLOCKED pending final Ubuntu gate and external/source prerequisites.** Package all changes together; do not drip-feed migrations/UI changes to hosted. This document deliberately separates safe local test operations from production changes.

## 0. Branch/install and preservation

1. Work only on existing `feat/polishing-integrated-20261023` based on verified original commit `267da00`; do not overwrite clean main. Inspect `git status --short --branch`, current staged/untracked changes and `git diff --check`. Preserve all uncommitted changes in Git before applying the new patch. If branch differs or any patch hunk fails, STOP; reconcile rather than force or reset.
2. Check package `SHA256SUMS`, then `git apply --check ...patch`, `git apply ...patch`. Do not extract a source ZIP over an existing working tree. No credential values are required.
3. The three new SQL filenames must be unique and the original 13 byte-identical. Run the source integrity guard; production migration history **must be read separately** before any `db push`.

## 1. ONE complete local engineering gate

`bash scripts/polishing/complete_polishing_local_gate.sh`

This checks original migrations, per-game resolver/rejection/source-outage tests, actual Edge handler submit contract tests, existing static/security tests, 76 research and Vitest, TypeScript, lint, production build, and a fresh, entirely synthetic loopback-only Supabase local stack: GoTrue sign-ins, signed JWTs, PostgREST/RLS, role management, review permissions, reference registry operator/service/read denial and account deletion request. Local stack uses no imported hosted data, no production keys, no real email service and no hosted writes. Private logs/keys are kept under a mode-700 Desktop folder. This test must be rerun on Ubuntu because package creation here cannot run Docker or the complete dependency toolchain.

All PASS messages are local scopes, not production acceptance. A 16-migration + security gate must succeed; any stage failure is a BLOCKED release, not partial permission to deploy.

## 2. Recovery + actual environment preflight (separate from code test)

- Compare remote `supabase_migrations.schema_migrations` and source filenames **read-only**: previously 13, but do not assume current remote still has 13. Check RLS tables/role grants, Edge configuration, `pg_cron` scheduler and Cloudflare main deployment commit/SPA/PWA settings. Never print player or environment secrets.
- Capture a new time-stamped hosted backup immediately before planned schema application with verified SHA-256 checksums. The last Oct 21 export passed isolated import, counts and FK validation but not original Auth trigger fidelity, complete Realtime grant parity or restored-user sign-in.
- Rehearse restoration of the current snapshot into a disposable, external-API-disabled environment and document how to reconstruct `auth.users`, identities, password hashes, Auth profile trigger, service permissions, storage, scheduled jobs, SMTP, Edge functions, Cloudflare configuration and secrets via a protected runbook. Verify constraints with triggers restored, not just `COPY` counts. **If complete Auth recovery/sign-in is unproven, do not perform risky live migrations.**
- Capture an authorized rollback decision tree: (A) JS/PWA regression -> roll back Cloudflare Pages to previous successful deployment, keep DB forward-compatible; (B) new function regression -> redeploy previous Edge function version; (C) additive SQL regression -> disable new feature at Edge, do not destructively drop tables with live requests; (D) suspected data corruption -> freeze writes and use isolated recovery plan with explicit authorization. Never reset production.

## 3. Independent daily sources gate

No producer/cron is shipped that invents official daily identities. Before marking five-game auto-identity complete, validate genuine source URL, publication/reset timezone, original share, permitted access, reference fingerprint, first independently corroborated seed and day/number progression (where applicable) **for each game independently**. Trial reference registrations into private staging only, with synthetic puzzles in synthetic testing. Stage actual game source records only after independent proof and change authorization. When source is unavailable, expired or conflicts, verify queued pending and **zero new awards**. Test unknown/ambiguous dates, wrong modes, provider outage, tampered reference, first/last seconds of reset boundaries and overlapping two-league eligibility. Do not claim complete automatic verification otherwise.

## 4. Deployed Edge and account-email gate (private staging before pilot)

- Deploy staged SQL in exact order #14 permissions, #15 streak, #16 evidence; apply through verified Supabase migration history with idempotence review (not `db reset`). Deploy exact new `competition` Edge handler to a private staging Supabase project with production-equivalent gateway auth settings, but synthetic users/leagues only. Confirm gateway method/JWT denial, anonymous/protected actions, league role matrix, invited user, grant/revoke, self-review prohibition, reviewer suggestions, deletion-request reauthentication, and public read-only standings.
- Verify actual Supabase Auth email confirmation/recovery support, Brevo/Supabase sender deliverability to an independent real account, code lifetime and replay prevention, enumeration safety and abuse throttling. **Do not enable email-code recovery until demonstrated.** The candidate UI explicitly labels it deferred. Existing authenticated sessions and login may remain operative, but describe lack of self-service recovery to pilot members honestly.
- Validate restored-user login with owner-controlled test account on a strictly isolated **trusted** Auth environment and no restored Auth public endpoint. The historical four users' password hashes in a backup are not sufficient proof of sign-in recovery.
- Validate Android OS Share Target cold/warm launch, exact original share confirmation, manual paste, pending duplicates, session persistence, offline retry, native result and server-verified streak or unavailable; 320px, 375px, desktop, 200% zoom, keyboard and screen reader; verify direct game links.

## 5. Guarded production deployment (NOT automated by this package)

Preconditions: external/source gates PASS or explicitly approved conditional deferrals; current production read-only reconciliation; complete recovery/rollback evidence; prepared release commit with source SHA and CI status; authorized production change window; current backup verified. The following are deliberate **operator steps**, not executable blanket shell commands:

1. Compare remote migration list; verify exact expected unapplied 3 additive SQL migrations. Inspect full SQL diffs; apply once in safe order through approved Supabase CLI migration mechanism. Read back migration IDs/grants and exact RLS negative tests; never claim PASS without responses.
2. Deploy Edge `competition` with the approved gateway JWT model; no unapproved broadening of service keys. Capture deployed version/hash. Confirm real deployed negative tests before enabling UI access.
3. Merge reviewed source only after staging tests. Cloudflare Pages Git deployment from `main` must report correct commit/build `node scripts/release/production-build.mjs` / `dist`; verify deployment and deep-link/PWA Share Target manifest, no client-side secrets, headers and real read-only smoke.
4. Compare protected app row counts before/after (not user data) and ensure **no historical award or original-share mutations**; verify backup and rollback checkpoints. One integrated deployment with explicit stop criteria; do not do a data reset, large backfill or any real deletion.

## 6. ONE consolidated owner UAT gate, after deployment only

Ask owner to perform one combined acceptance (not individual per-feature rounds):

- **Auth/PWA:** authenticated Android and browser session refresh, cold/warm OS Share Target with exact original share for confirmation, manual paste and duplicate denial, no lost drafts, safe sign-out.
- **Home/My Results:** one eligible card per distinct daily game, native result not competition points, accurate pending/outstanding/awarded/status/streak or unavailable, official Play Game link, expandable per-league explanation, Share Result separate; Today summary and historical game filters.
- **Leagues/Rankings:** Find versus My Leagues, private listing privacy, creation→first season, Members/Review Queue/Invitations near selector and advanced panels collapsed, deterministic initial league/season in Rankings and persisted manual choice, no invented points.
- **Permissions:** separate accounts as Owner, Member, new Moderator, each individually granted Moderator, outsider from another private league; readable username/full UUID/effective rights, owner-only role changes, review delegated independently, revocation immediate, denied controls give adjacent feedback, no self-review.
- **Identity/data:** five original genuine shares with documented verified source identity can auto-process only when complete server chain passes; ambiguous date/mode/source outage remains pending; reviewer suggestions do not alter historical points; two overlapping eligible leagues scored independently only where valid; original submissions/awards preserved.
- **Account:** deletion request reauth/status only, no actual deletion; password code recovery marked deferred unless proven externally; accessibility at mobile/desktop and zoom; no account/email leakage.

Owner signs off the full UAT ledger only once all mandatory criteria pass or explicitly authorizes specific conditional deferrals. **Only after that** resume deferred Step 12 cross-league/season, independent external email and the 5–10-player broader pilot. If any critical invariant fails, stop rollout, perform documented non-destructive rollback and keep Step 12 paused.
