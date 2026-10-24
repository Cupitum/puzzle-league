# Puzzle League — Polishing Phase guarded deployment & recovery runbook

**Status: Implementation candidate. No hosted migration, Pages deployment or user acceptance confirmed.**

## Ground truth

The owner terminal output on 23 Oct 2026 showed a clean `main` at `267da00`, matching its local `origin/main` reference, with 13 migration files and newest on-disk guide v2.9. Local `origin/main` equality is **not** a fresh remote GitHub fetch. Historical scoped hosted PASS evidence from 21 Oct remains evidence of those tests only, not proof of these changes.

The candidate adds migrations `20261023100000_polishing_permissions_and_requests.sql` and `20261023100100_polishing_verified_streak.sql`, and changes Edge `competition`, React, release scripts and tests. The 13 legacy migration contents and frozen scoring code must remain byte-identical. Deployment requires migrating Supabase **before** deploying the new Edge + frontend; keep the new UI disabled from users until migration, Edge, authorization and rollback checks pass.

## Absolute stop conditions

**STOP** if HEAD/dirty status, linked project ref, installed remote migration history, 13 legacy migration checksums, SQL role grants/RLS, Edge JWT checking, or user data counts diverge; if backup isolation/complete Auth recovery is not proven; if any role negative test or migration dry run fails; if production secrets enter logs; or if independent source identity claims cannot be demonstrated. No destructive reset, automated historical score award, database wipe or live deletion is authorised. Do not set a league owner/moderator as a platform admin.

## A. Safe source preparation (Ubuntu)

1. Preserve existing source and any uncommitted work before touching it. On a clean `267da00` working tree: `git switch -c feat/polishing-integrated-20261023`.
2. With this package's `puzzle-league-polishing.patch` copied next to the source checkout, run `git apply --check /path/to/puzzle-league-polishing.patch`; on success only, run `git apply /path/to/puzzle-league-polishing.patch`. Verify `git diff --check`, inspect all added SQL and key permissions; keep old 13 migrations unchanged.
3. Run `npm ci`, `npm run check`, `node --test tests/polishing-contract.test.mjs scripts/release/tests/release-contract.test.mjs`, and `node scripts/release/production-build.mjs` under approved public **publishable** production variables only. Do not use service-role keys in the frontend.
4. Exercise Edge handlers and SQL in an isolated Supabase clone. Create fixture owner, ordinary member, newly promoted moderator, moderator with each individual grant, revoked moderator, unrelated league outsider and anonymous caller. Test roster read, invite, suspension/removal, moderator promotion, review, self-review, deletion request/status read, cross-league denial and immediate revocation. Check original Share Target, offline draft, login persistence, Android narrow/zoom and desktop.
5. Baseline source tests and historical pilot tests must not be relabelled as live acceptance.

## B. Recovery gate — before any production migration or deployment

1. Inspect Oct 21 backup under `$HOME/Desktop/Puzzle_League_Backups/hosted_supabase/pilot_20261021T132201Z_2CnScS/` **on your Ubuntu host**. Run `cd "$HOME/Desktop/Puzzle_League_Backups/hosted_supabase/pilot_20261021T132201Z_2CnScS" && sha256sum -c SHA256SUMS`. This checks **integrity only**.
2. Make a new encrypted application backup at a private, `chmod 700` location through your pre-existing documented hosted-backup workflow. Reconcile current counts/read-only schema and migration history first. Do not print rows, invite tokens or Auth fields. **No direct production data tests.**
3. Restore the *new* backup in a separately named **isolated/disposable** matching PostgreSQL/Supabase instance (never production) and verify: all application tables, indexes/checks/constraints/functions, migration history, RLS/grants, nonsecret aggregate row counts and a test authentication-to-profile linkage. Prove **complete Auth** export and restoration with independent test sign-in and authorization, not only an `auth_data.sql` filename or row-count comparison. Document provider config, Storage, secrets, SMTP, pg_cron, Edge and disaster-recovery sequence. Until this is demonstrated, release is blocked.
4. In isolated rehearsal, dry-run/migrate the exact two additions and execute all role-matrix, timezone/streak, review/award immutability, deletion-request, and rollback/forward-fix tests. Record actual SQL migration IDs and errors, never fabricate PASS.
5. Plan rollback: capture current Git SHA and current Cloudflare deploy version; revert UI and Edge **together** if needed. Schema is additive and should normally remain dormant; **never `DROP` the protected deletion-request/audit tables or reset hosted migrations** as a rollback. Escalate to approved forward-fix SQL preserving records. Independent restoration is a disaster-recovery last resort under separate explicit authorization.

## C. Guarded release (only after A and B pass)

- Validate local `origin/main` against freshly fetched private remote before merge; CI status must be evidenced. Compare hosted Supabase migration list with the 13 applied baseline migrations and explicitly confirm no surprise IDs. Use `scripts/release/remote-dry-run.sh` with a privately set `RELEASE_SUPABASE_PROJECT_REF` (no secrets in logs).
- Apply **only** the two reviewed migrations using Supabase's approved linked, preflighted production workflow. Capture actual migration log, database count/RLS evidence and live role grants before moving on; if different, STOP.
- Deploy `competition` Edge Function with its existing JWT validation and protected service-role environment; record deploy version and verify anonymous/forged actor/outsider denial **without touching real submissions**.
- Merge/push the tested source via the established GitHub private `main` workflow and verify Cloudflare production SHA, HTTPS deep link, PWA manifest/share target and asset caching. Record Cloudflare rollback version. No direct Supabase/Cloudflare deployment has been carried out by this artifact.
- Run one consolidated owner UAT on authorised pilot identities only: five game's current genuine shares with verified trusted reference or explicit pending, duplicate, owner/mod/member role matrix, all league/review/roster UI, Home/My Results/Rankings, mobile+desktop Share Target and session, account deletion **request only**, and delivery/code recovery only if later explicitly enabled. Record PASS/FAIL and owner acceptance. Do not create fake awarded identities.

## D. Manual platform-administrator deletion register procedure

Requests are made by authenticated, email-confirmed users with a fresh current-password challenge. Edge sends the password to Supabase Auth for verification and discards it before the privileged RPC call; it is not stored. Passwordless accounts cannot use this pilot request path. Request status is visible only to its account. **There is no automatic deletion or platform-admin UI.**

A trusted Supabase platform administrator must periodically check the private `app_private.account_deletion_requests` register in a controlled DB console via a privileged admin role, using a minimal aggregate query such as:

```sql
select status,count(*) from app_private.account_deletion_requests group by status;
```

After privately verifying the specific request, identity, legal/policy retention requirements, owned-league ownership resolution, Auth account restoration limitations and backups, the administrator may call `select app_private.p7_admin_deletion_status('<request-uuid>'::uuid,'under_review');` **from a trusted admin DB session**, then document the decision. Never paste real UUIDs into a public conversation. For `completed`, first perform separately approved, legally compliant fulfilment; it does not delete anything automatically. The owner must approve privacy/retention policy before the first real account deletion. Configure a secure administrator notification/queue-check schedule before a wider pilot; no outbound alert endpoint is configured here.

## E. Scope and explicit deferrals

- **Automatic five-game official identity discovery is NOT proven**: scoring accepts exact already-verified `game_puzzles`; new unverified modes/dates remain pending. No guessed seed, naive +1, or simulated source considered sufficient. Add verified per-game official source adapters after independent source provenance/date/reset-mode evidence and controlled live verification. Historical `pending_evidence` only returns request-scoped, read-only suggestions with raw SHA-256, verified-day and evidence state; it cannot award, relink, or rewrite records. The six local pending results are excluded.
- **Email code password recovery deferred**: Supabase/Brevo external code delivery, replay defence, expiry and end-to-end verification unproven. No improvised insecure reset mechanism shipped.
- Streaks in this candidate are consecutive **verified awarded puzzle days in any participating league**, anchored to today/yesterday, with `null` when unsupported. They are not claims that every missed game was independently verified; review edge rules before acceptance.
- No assertions of successful hosted deployment, production acceptance, isolated recovery or Auth restoration without real evidence.

## F. Game-source verification research checkpoint (read-only, 23 Oct 2026)

This is a **research clue, not a signed-off puzzle identity feed**. The FoxiMax official instructions (`https://www.foximax.com/about.html`) say that the default daily reset is midnight GMT, but players can select a local-midnight setting. Polygonle official tips (`https://www.polygonle.com/tips`) describe a daily puzzle resetting at the player's local midnight, with separate Unlimited/Custom modes. The Minute Cryptic homepage (`https://www.minutecryptic.com/`) displays dated daily clues, but a current page heading alone does not establish an immutable share-to-identity/date mapping. The Krillion site used by this project (`https://krillion.io/`) offers a Daily Dive, while many similarly named sites appear in results and must not be treated as the same authority. This confirms why **one shared date-to-ID counter or UTC reset rule is unsafe**. Official share identifiers, provenance, mode and supported reset behavior require independent tests for each game before any promotion from pending to automatic acceptance. No external source content was imported into the database.
