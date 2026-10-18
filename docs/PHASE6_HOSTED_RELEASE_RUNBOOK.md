# Puzzle League Phase 6 — Consolidated hosted deployment & pilot runbook

**Prepared 2026-10-18 from commit `ab7122b` (source ZIP comment full SHA).** This is a release **preparation package**, NOT a production deployment. No cloud accounts/URLs/keys were provided. Thirteen existing migrations are preserved byte-for-byte, and no schema, parser, approved score rule, original share, award or review history is changed.

## Design and safety boundaries

1. **Approved architecture unchanged:** React 19/Vite client on **Cloudflare Pages**, managed **Supabase** PostgreSQL/Auth/Edge Functions, private GitHub main and Android installed PWA. This package adds `public/_headers`, `public/_redirects`, fail-closed production build validation, hosted anonymous smoke checks and a no-credential hosted CI job. It does not replace the Edge API or weaken RLS. Do **not** expose the local VM's Supabase ports or import its development users/results to production.
2. **Secrets:** `VITE_APP_STAGE`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` alone are browser public. The build accepts an `sb_publishable_` key, never `sb_secret_` or service role. Server-side `SUPABASE_SERVICE_ROLE_KEY` is used inside the existing Edge function only; verify managed runtime availability without printing its value. `SUPABASE_ACCESS_TOKEN`, database password and CLI link credentials must stay private in the owner's password manager/CLI session and **never Git, chat or build variables**.
3. **Release decision:** Create a **new empty hosted Supabase project** for pilot; do not duplicate the local six pending submissions or old awards. Confirm identity for real puzzle results before any approval. Six local cases remain pending, including three parser-recovered Polygonle #1539.

## Gate A — Local source package + GitHub

Install once with `APPLY_TO_REPO.sh` from outside the repository, then run `bash scripts/release/local-gate.sh`. It executes release contract tests, the existing full `scripts/phase6/verify.sh` suite and a read-only three-case evidence comparison. It requires the original Git anchor and existing 13 migrations. Do not run `supabase db reset`. On PASS review an **exact path-limited staged diff**, no secrets, `git diff --cached --check`, commit and push through the original history. A `git push` is **not** an executed GitHub Actions PASS. Visit GitHub Actions for the actual `verify.yml` and `release-readiness.yml` workflow conclusions at the same commit; save redacted run URL, SHA, status and logs. **No CI secrets are required by the new workflow.**

## Gate B — Managed Supabase: target and backup decision BEFORE DB push

Create project through [Supabase Dashboard](https://supabase.com/dashboard); document **private** expected 20-character project ref, region, billing tier, recovery plan and operator access. Configure Auth `Site URL` to the exact planned HTTPS Cloudflare Pages origin and allowed redirect origins; configure email confirmation and SMTP deliverability; restrict account and Edge abuse via supported product controls. For serious production, establish scheduled external backups and a tested isolated restore; on Free, do not assume daily managed backups (see Supabase backup docs). Project backups generally do not restore every associated storage object or Auth configuration. Never automatically restore over the live project.

Run from the Ubuntu repo (interactive CLI login and project linking are performed **by the owner**; do not paste credentials):

```bash
npx --no-install supabase login
npx --no-install supabase link --project-ref YOUR_ACTUAL_PROJECT_REF
export RELEASE_SUPABASE_PROJECT_REF=YOUR_ACTUAL_PROJECT_REF
bash scripts/release/remote-dry-run.sh
```

Review **all 13 migrations** in order before applying. In particular, `20261015100300_phase4_enable_scheduler.sql` creates `pg_cron` in `pg_catalog` and requires an active five-minute season maintenance job. Investigate Supabase project extension policy/permissions, job database and execution logs, and deny client access to the `cron` schema. Some migrations contain intentionally privileged functions. Verify RLS, function owner/execute grants, `auth.users` profile lifecycle and audit immutability after application. The dry-run **never applies migrations**. Only after the intended linked project ref, backup/recovery arrangements, and detailed dry-run review are separately signed off, run **manually**:

```bash
npx --no-install supabase db push --linked
npx --no-install supabase functions deploy competition --project-ref YOUR_ACTUAL_PROJECT_REF --no-verify-jwt
```

The Edge code intentionally checks real player JWTs itself because `competition` also serves public standings. Validate host configuration and legacy `SUPABASE_SERVICE_ROLE_KEY` availability inside managed Edge; never put service-role values in the browser. If any migration fails, **stop, preserve logs, inspect partial state and history**; never reset, repair history casually, rerun blindly or drop the database. Confirm the remote thirteen registered migration IDs, the `cron` worker is actually running, RLS, and Auth/Edge positive + negative scenarios with separate **disposable, purpose-created remote accounts** that are safely cleaned; use local tests as templates but do not run local-only destructive tests against hosted production.

## Gate C — Cloudflare Pages with no server secrets

Connect the **existing private GitHub repo** to Cloudflare Pages. Production branch `main`, Node.js 24, build command `node scripts/release/production-build.mjs`, output directory `dist`, root directory `/`. Set these **PUBLIC** build environment variables for the production branch:

```text
VITE_APP_STAGE=production
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<copy the publishable sb_publishable_ key privately into Pages Settings>
```

Do **not** add service-role keys, JWT keys, Supabase PATs or passwords to Cloudflare. The wrapper fails if a production build uses HTTP/localhost, an absent or forbidden key, or unexpected `VITE_` variables, and checks the built service worker, manifest and headers. Configure Pages branch protection/preview policy; previews must not quietly point at live production auth/database. Pages normally rebuilds on Git pushes. Verify exact deployment SHA, public HTTPS origin, custom domain/DNS if used, TLS and Auth redirect URLs; do not claim production readiness just because a `pages.dev` URL exists.

`public/_redirects` provides a React deep-link fallback. `public/_headers` sets browser baseline headers (nosniff, frame denial, referrer and SW no-cache). **The production build wrapper generates a strict project-specific Content Security Policy** on the published `dist/_headers`, allowing `connect-src` only to `self` and the selected managed HTTPS Supabase API origin, plus a narrow static asset policy. The source `public/_headers` intentionally excludes a hardcoded Supabase project URL. Test the resulting CSP with real authentication, service worker and Android share intake; any required policy changes must be code-reviewed and tested. Capture actual response headers in browser DevTools. Also verify `Permissions-Policy` and privacy/no-cache handling. Do not use Cloudflare/Pages proxying for privileged API traffic.

When the actual site exists, privately set env variables in your terminal or environment (publishable key is PUBLIC but avoid dumping it in logs), and run:

```bash
export VITE_APP_STAGE=production
export VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
export RELEASE_SITE_URL=https://YOUR_SITE.pages.dev
node scripts/release/hosted-smoke.mjs
```

The hosted smoke test **only** GETs HTTPS public files, OPTIONS Edge, and POSTs a denied unauthenticated **read** action; it does not create accounts, submit a game or award points. Its PASS is not proof of signed-in RLS/Android/pilot.

## Gate D — Actual hosted authorization, recovery and monitoring

- Run positive and negative browser cases using separate disposable real Auth users: owner vs member vs delegated moderator, outsider/private league denial, forbidden client table writes, cross-league data isolation, duplicate pending result, unauthenticated Edge actions, unsupported share handling, correction approval without self-review, late-window & per-league eligibility. **No synthetic assertions of official puzzle identities; no forced verification shortcuts.** Ensure server-side audit and awards remain immutable with appropriate admin permissions.
- Configure monitoring for Edge error rates and logs (redact share text and JWTs), Auth delivery, database load/storage, cron job executions/late runs, failed confirmations, billing quotas, backup failures and anomalous moderation. Capture escalation contacts and rollback (restore to separate recovery target first). Test **production** backup and isolated recovery, not only the VM Phase 3 restore.
- Review rate limits/account lockouts and supported SMTP provider, Supabase Free idle pauses and hosting billing. Non-public data must not appear in Cloudflare Analytics, URL query strings, logs, GitHub Actions artifacts or browser caches.

## Gate E — HTTPS Android share + pilot acceptance

- On at least one real Android device with installed PWA over the **actual** Pages HTTPS origin, start with paste fallback and account login/refresh/session persistence, then original game Android Share → Puzzle League → original raw-text preview → player confirmation → trusted backend status. Test Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion using **real** shared puzzles or valid genuine shares; unsupported modes route pending, never auto-award. Test re-launch, already-open PWA, offline and network failure, 48-hour late/review states, duplicate attempt, and across two joined eligible leagues; verify no raw share in URLs, service-worker static caches or public standings.
- Pilot about **5–10 people** with at least two leagues/roles and agreed selected games. Record actual signed-in cross-league per-game and combined rankings, separate streaks, participation points, membership effective dates, historical review, moderator access, scheduler season rollover/finalisation and score reconciliation. Use checklist in `docs/PHASE6_RELEASE_ACCEPTANCE_MATRIX.md`. Unresolved historical six local cases remain pending; do not import them to cloud as genuine scores.

## Final go/no-go

**Go** only when: source commit and actual CI PASS; exact managed schema/Edge deployment + logged-in security PASS; unattended season scheduler observed; hosted recovery rehearsal PASS; Pages HTTPS browser/config/CSP PASS; installed Android Share Target and paste fallback PASS; authentic multi-player five-game pilot, season/award reconciliation PASS; outstanding privacy/security findings triaged; clear support/rollback owner. Otherwise label each untested item `NOT VERIFIED` and keep Phase 6 **OPEN**. No background process is claimed by this package.

References (research, not proof of owner provisioning):
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase Edge deploy: https://supabase.com/docs/guides/functions/deploy
- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages static headers: https://developers.cloudflare.com/pages/configuration/headers/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
