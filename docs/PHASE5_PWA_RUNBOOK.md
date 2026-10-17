# Puzzle League — Phase 5 integrated Android-first PWA runbook

**Scope:** UI, browser Auth/session, leagues/invites/seasons, share/paste submission, standings/history/streaks, moderation/reports, responsive UI, offline shell and Android Share Target. **Phase 5 is PREPARED, not accepted, until owner tests run including real installed Android sharing.** Phase 4 trusted server and its nine registered migrations are unchanged. Phase 6 cloud deployment/pilot is NOT performed by this package.

## Source and safety

Entry Git commit: `47ea0df00e54722e96b0c6e7d1b191fa5e125572`, `main`, clean Ubuntu VMware checkout. Original Git history and Phase 1 research hashes must be retained. Extract `Puzzle_League_Phase5_Integrated_PWA_PREPARED_2026-10-16.zip` **outside your checkout**; run its `APPLY_TO_REPO.sh` with your existing project path (below). The installer checks exact Git SHA, clean tree, expected baseline hashes, absence of new-file collisions and payload integrity; it privately backs up the four changed original files and applies the additions. It never uses `git init`, resets the database, applies migrations, overwrites `.git`, or touches server-side credentials.

```bash
cd ~/Desktop
unzip -q Puzzle_League_Phase5_Integrated_PWA_PREPARED_2026-10-16.zip -d puzzle-league-phase5-package
bash "$HOME/Desktop/puzzle-league-phase5-package/APPLY_TO_REPO.sh" \
  "$HOME/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e"
cd ~/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
```

Review any unexpected installer refusal instead of bypassing. Do not replace your checkout with a raw extracted source archive.

## Local Auth and public-only configuration

Create ignored `.env.local` manually (no need to show or upload any token). `VITE_SUPABASE_URL` is the *browser reachable API origin*, usually `http://127.0.0.1:54321` **only when the browser is inside the same Linux VM**; `VITE_SUPABASE_PUBLISHABLE_KEY` is the **public** local anon/publishable key from your own local `supabase status`. The label `VITE_APP_STAGE=local` is optional. Do not use `VITE_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, any `sb_secret_...` key, or JWT/database passwords in a Vite variable, any frontend file, command shared into chat, or the repo. Review the ignored env file before distributing screenshots/logs. Browser refuses an off-device non-HTTPS API origin at configuration level.

For a local browser preview after the server is running, use `npm run dev -- --host 127.0.0.1` and open the Vite page **inside Ubuntu**. The React app makes real Auth and Edge REST requests; a static `npm run dev` without Supabase is not a functional backend acceptance. Account creation may require confirmation email according to local Auth settings; use disposable test identities, never real passwords in terminal logs.

**Important:** Android on a different phone cannot reach the Ubuntu VM’s `127.0.0.1` and ordinary HTTP cannot register an installed Share Target. A safe, **explicitly approved HTTPS origin accessible from the actual phone** is required for the device gate (HTTPS UI and HTTPS API). This package does not configure an internet-facing VM, tunnel, DNS, Cloudflare Pages site, managed Supabase project, or expose private local database credentials. Those operations require a separate provisioning decision and careful access control; do not open Supabase’s local development service to the public Internet as a shortcut. Using a temporary secure test deployment for device verification does not by itself complete Phase 6's production/release gates.

## User-facing behavior

The app uses existing `competition` Edge actions; it has **no ability to certify game dates or modes**. The five approved games and scoring IDs are preserved. Share text is displayed in a textarea with a **display-only game header hint**, explicit confirmation and one trusted `submit` POST. The server ignores any forged points and chooses pending/accepted/duplicate/awarded states. `my_history` is a 100-entry server summary; it does not give full per-league award history. The rankings tab shows only server-awarded entries. Public league discovery reads the existing read-only RLS-protected `leagues` table; public-season standings can be shared by season-ID link, while the server currently requires sign-in for `season_list` (so anonymous visitors cannot enumerate all public seasons in this release).

Owners may create/start/schedule leagues, issue/revoke one-use invitations, manage eligible members, and delegate *separate* roster-view and review permissions to active moderators. Existing backend independent-review and verified-daily identity gates apply. The UI can file reports, request league-specific historical exceptions and approved-score corrections (the latter only when an entry already exists). Client controls improve usability but **never replace server RLS/RPC checks**. The UI does not add an operator-facing puzzle-certification action; that remains an offline verified-evidence operation on the trusted backend. Roster entries display limited account UUID fragments, not personal email addresses; the existing backend does not expose other users’ profile nicknames to the roster UI. Users can see their own recent result summaries but not global raw/result details, by design of the existing API.

The PWA has `public/manifest.webmanifest`, root-scoped service worker and 192/512 icons. Android `Share` of text/title/url into the installed PWA reaches the service worker as a POST; it stores the inbound text temporarily in **same-origin IndexedDB**, navigates to `/?incoming=1`, then React consumes and deletes the temporary record. **No raw share is placed in a query string and no automatic network submission occurs.** Explicit confirmation is mandatory. Auth/REST/Edge requests and credentials are never cached by the service worker. Static shell cache permits a limited offline view; backend writes require connectivity and a server receipt. Avoid shared browsers/devices when using personal puzzle results; signing out clears session storage, not already-processed server history. Browser tab refresh may require sign-in again; sessions intentionally live in `sessionStorage` (not permanent `localStorage`).

## One consolidated owner-side local verification

After installer, `npm ci` (if dependencies absent), verify the local Supabase stack is running, and run **one consolidated** command:

```bash
bash scripts/phase5/verify.sh
```

It runs the four Phase 5 Share Target/contract checks and six existing Phase 4 parser tests, service-worker JavaScript syntax, manifest/source review, existing full `npm run check` (8 Node, 76 research Python, 9 existing Vitest plus 9 Phase 5 Vitest tests, TS, Oxlint, build), serves the generated PWA assets on localhost, checks exact nine local migrations, runs real Phase 3 JWT + Phase 4 Edge/award+cleanup authenticated tests, scheduler and RLS SQL rollback tests, protected migration hashes and Git whitespace checks. It may start a local Edge function **only if none is running**, then stops only its own process. Disposable synthetic result checks retain anonymised server audit. It does not run `supabase db reset`, apply migrations or overwrite local data. If it reports an error, do not commit; preserve first failure and redact logs before sharing. Note that historical `scripts/phase4/verify.sh` has an old-source Git SHA preflight by design and must not be invoked on the new `47ea0df` checkout; the Phase 5 verifier exercises its relevant tests directly.

The single command does **not** replace usability/Android evidence. Run the following manual acceptance cases after the local script succeeds; document PASS/FAIL/NOT TESTED for every item. A real Android phone and supported installable browser are essential:

1. In an Ubuntu/desktop browser, local Auth signup/signin/signout and public nickname update; no login email appears in public UI rankings.
2. Two independent signed-in test accounts: create public/private leagues; public join; one-use private invite; outsider cannot view private season; member leaves/rejoins without retroactive points.
3. Owner creates calendar and rolling seasons with selected game snapshots; schedules future game changes without changing the active season; verify combined, per-game leaderboard and separate streaks reflect **server data**.
4. Paste a real or clearly labelled synthetic share in a test-only setting, inspect preview, ensure **no request happens before confirmation**; confirm one trusted submit, pending/accepted result and duplicate. **Do not operator-verify a made-up puzzle as authentic;** only synthetic local test fixtures in the scripted isolated/cleaned acceptance are approved.
5. Member submits a correction/historical request; authorised *independent* reviewer can resolve eligible requests only when backend verification gates permit; self-review and outsider attempts fail; moderator without explicit privilege cannot review; member safety report and independent report resolution.
6. Guest public league discovery and public leaderboard via a season-ID link; unauthenticated user cannot access private standings or write; player-only users cannot execute owner/moderator RPCs.
7. On **actual Android Chrome or another confirmed Share Target-capable browser, over HTTPS**, install Puzzle League through browser install UI. From each of the five original games (where sharing text is available), choose Android Share → Puzzle League, inspect original text in the PWA without any score/network submission yet, confirm explicitly, then verify an authenticated server submission receipt or safe pending status. Repeat with paste fallback, refresh/relaunch, offline open + blocked write, reduced motion, keyboard focus, narrow-screen layout and screen reader labels. Record device, Android/browser version, secure origin, install status, screenshots/logs with sensitive content redacted, and actual PASS/FAIL for each game format. Do not assert Android Share Target PASS from manifest syntax or desktop emulation.

**Phase 5 exit** requires scripted **LOCAL PASS** *and* manual UI / real Android Share Target acceptance **PASS**. Until then label `PREPARED / NOT VERIFIED ON OWNER VM` and `ANDROID DEVICE NOT TESTED`. Hosted CI, managed production deployment, real-game authenticity and live pilot still belong to Phase 6.

## Safe source closeout only after PASS

```bash
git status --short --branch
git diff --check
git diff --stat
git diff --name-only
# Review the exact changed/new file list; no secrets, .env.local, logs, database dumps or research changes.
git add -- .env.example index.html src/ui/App.tsx src/ui/styles.css \
  src/domain/competition src/infrastructure/client.ts src/infrastructure/client.test.ts \
  src/infrastructure/pwa.ts public scripts/phase5 docs/PHASE5_PWA_RUNBOOK.md
# Stage authoritative guide separately only when this guide's verified status is updated.
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached --name-only -- research/ supabase/migrations/ supabase/functions/
# Last command MUST show no changes to protected research/server source.
git commit -m "feat: implement Phase 5 Android-first PWA experience"
git push origin main
git log -1 --oneline
git status --short --branch
```

`git push` is not evidence that GitHub Actions executed successfully. Record actual commit, clean status, local test output and Android device verification in updated guide. There are no Phase 5 migrations or changes to approved scoring rules in this package.


## Phase 5 device-failure remedial onboarding — 17 October 2026

The installed app can be shell-installable while lacking browser Supabase settings. A passing SQL/Edge acceptance run does NOT fill in Vite's `import.meta.env` variables. In the repository root `~/Desktop/Development/Puzzle_League`, use `python3 scripts/phase5/configure_local_env.py` **once**. The script runs the local Supabase CLI with captured output and writes only the public local URL and verified publishable/anon key to `.env.local` (mode 0600), which is already git-ignored. It refuses to overwrite any existing file, use service-role keys or emit secrets into terminal output. Manually edit existing `.env.local` with `nano .env.local` if needed. The file is hidden (Ctrl+H in Files), **not a directory**. Restart the Vite dev server and reload/reopen the installed Android app after configuration.

Signup now collects a *public username/display name* (not a unique handle/login ID), email, password, confirmation password, and offers Show passwords. Auth sign-up metadata stores only the requested public display name through any email-confirmation requirement; after the first authenticated login the existing server `update_profile` action sets it if the profile still holds the generated `Player-...` nickname. This does not alter Phase 3 profile triggers, nine migrations, server award/permission policies or unique-account semantics. If the update fails, the user is signed in with an actionable warning and may set it under Account > Player profile. Later login does not override a customised name.

For local confirmation email, inspect the configured local Supabase email testing inbox (typically `http://127.0.0.1:54324` inside Ubuntu), not production SMTP. Do not upload credentials, public keys, raw share texts or full Supabase status to chat. Real signup/confirmation/login and Wordle Android share acceptance still require owner device evidence before Phase 5 COMPLETE.

### October 17 session and league-owner UX correction (prepared, device gate still pending)

The new Android account continuity fix uses same-origin browser `localStorage` rather than per-window `sessionStorage`, with an existing-session migration and explicit cross-window logout. It preserves Auth refresh token handling and never stores privileged service-role credentials. This is a browser-session design tradeoff; on a shared device, use **Account → Sign out** and avoid installing the app under an untrusted browser profile. Android Share Target must still prompt for confirmation and may never score client-side.

After changing source, restart Vite, reopen/refresh the installed PWA, and follow `docs/PHASE5_SESSION_AND_LEAGUE_UAT.md`. League setup is now presented as a two-step owner workflow: create a persistent community, then select the games and cadence for its first season. Do not run a destructive local database reset to test this workflow.
