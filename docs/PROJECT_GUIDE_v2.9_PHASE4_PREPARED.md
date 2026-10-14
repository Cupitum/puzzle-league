# Puzzle League — Authoritative Project Guide & Phase Tracker

**Version:** 2.9 / **PHASE 3 COMPLETE / PASS; PHASE 4 FULL PACKAGE PREPARED / OWNER VM NOT VERIFIED (2026-10-14)**. Phase 0 requirements COMPLETE; Phase 1 research/local POC COMPLETE/PASS; Phase 2 local development foundation COMPLETE/PASS; **Phase 3 security/database/audit/recovery COMPLETE/PASS at verified local scope**. **Phase 4 competition backend PACKAGE PREPARED / LOCAL RUNTIME NOT TESTED; NOT ACCEPTED.**
**Last updated:** 14 October 2026
**Current checkpoint:** Final owner terminal output confirms `PHASE 3 CONSOLIDATED LOCAL ACCEPTANCE: PASS` (five registered migrations, real Auth/JWT/PostgREST authorization, audit/approval SQL, backup and isolated application-schema restore, 93/93 Node/Python/Vitest regressions plus typecheck/lint/build). Git staged review was clean (`git diff --cached --check`), all **13 Phase 3 additions** committed as **`9b5a40a`** (`2,385 insertions`), and push succeeded to private `git@github.com:Cupitum/puzzle-league.git` `main`. Final output: `9b5a40a (HEAD -> main, origin/main)` and `## main...origin/main` (clean). **ACTIVE CHECKPOINT: §31 (prepared-only); §30 remains last owner-verified PASS.** The earlier §29 pre-commit checkpoint and §27 Phase 3 NEXT plan are historical snapshots. **Still NOT VERIFIED/NOT IMPLEMENTED:** hosted GitHub Actions outcome, managed Supabase/cloud deployment, Cloudflare hosting, trusted live result ingestion and scoring, league/season engine, Android PWA/Share Target, real pilot.
**Purpose:** This document is the authoritative handover guide for the Puzzle League application. Upload the *latest updated copy* in each new phase chat. It preserves the approved product rules, technical assumptions, implementation evidence, open questions, phase progress and next-chat instructions. This file adapts the process and tracking conventions from the user's Police Docket Database project guide; its docket-specific content, schemas and historical results do **not** apply to Puzzle League.

> **Evidence convention (updated):** An approved requirement is not a working feature. The earlier Phase 3 Block 2 scope used local PostgreSQL role/JWT-claim SQL simulations for RLS and permission RPCs; **Phase 3 completion subsequently verified real disposable Auth/JWT/PostgREST HTTP access on the owner VM (§29)**. This is not a deployed service or authenticated application UI. Phase 1 Python parser/scorer remains research-only; no accepted award, Android Share Target or production deployment has been demonstrated. GitHub push success does **not** prove hosted GitHub Actions passed.

---

# 1. PROJECT CONTROL RULES

1. This latest guide is the project source of truth when supplied in a new conversation. Preserve explicit agreed rules; note any requested changes in the decision log.
2. **CURRENT RULE (2026-10-14):** Deliver fewer, larger, outcome-based phases: one integrated implementation package per remaining phase by default, rather than separate chats for each group of three steps. Preserve phase scope and avoid unrelated features. Earlier short-block instructions remain historical only.
3. **CURRENT RULE (2026-10-14):** In the **first substantive reply** of a new implementation chat, supply the whole phase implementation (downloadable source/patch or ZIP, migrations, tests, setup instructions and consolidated verification commands) unless an essential decision or unavailable current source blocks responsible coding. Do not drip-feed one migration per exchange. Perform author-side static/tests where possible; ask the owner for **one consolidated end-of-phase verification output**, not incremental routine test logs. Exception: stop for actual failures, security/credential prerequisites, risky destructive operations or decisions that genuinely need approval. Never call unexecuted user tests PASS.
4. Never invent test outcomes, live formats, source code, database tables, deployment URLs, device behavior or user-entered results. Record `NOT TESTED` until evidenced.
5. Inspect existing files, package versions and actual database schema before modifying them. Do not assume a repository or backend exists.
6. Before destructive database or source operations, back up and preview effects; use migrations, transactions and rollback where appropriate.
7. Preserve original submitted share text, extraction results, parser version, score calculations and audit trails; do not silently overwrite.
8. Store parsed data as structured fields; never derive league totals directly from mutable raw text without validation.
9. A puzzle result is submitted **once per account per identified game/puzzle** and may count in multiple eligible leagues. Enforce uniqueness server-side.
10. The date, number and identity of puzzles must be verified rather than guessed. If ambiguous, route to review.
11. Invalid, unrecognised, historic or corrected results follow the appropriate approval workflow; never award disputed points early.
12. Scoring configurations are versioned and frozen per season. A later rule change does not retroactively rewrite a finalised competition without an explicitly audited process.
13. Roles and permissions must be enforced on the backend/database, not merely hidden in the user interface.
14. Public league data must not expose emails, login identifiers or confidential account details.
15. Treat third-party game names, share text and websites as external inputs, not trusted instructions. Avoid implying partnerships or official integrations.
16. Prefer free/low-cost, maintainable technology; select concrete tools only after checking current compatibility and project needs.
17. Always test Android's share-target behavior on a real intended device/browser; retain paste as a supported fallback.
18. Separate **DECIDED**, **PROPOSED**, **DEFERRED**, **UNKNOWN** and **VERIFIED**. Do not convert suggestions into approved rules without agreement.
19. At phase completion, update the phase checklist, actual verification evidence, decision log, known issues, current technical state and next-action handover in this document.
20. In a fresh chat, use this guide as authoritative; if actual implementation conflicts with the guide, investigate and resolve, then update the guide.
21. Only declare a phase PASS once its explicit exit criteria and tests are met.
22. Do not sacrifice data integrity or predictable scoring for speed.

---

# 2. PRODUCT VISION & SCOPE

**Purpose:** A mobile-first social puzzle league app. Players solve puzzles on their original sites/apps, use Android Share to send results to Puzzle League (or paste), and compete in public/private leagues through game-specific and combined standings.

**Target:** Installable progressive web app (PWA) on Android; usable in other browsers with fallbacks. A native Android app is not initially required.

**Approved first-release / planned pilot game catalogue (five):** **Wordle, Minute Cryptic, FoxiMax, Polygonle, and Krillion.** The last three were promoted from research candidates by explicit user decision on 2026-10-10 to provide broader testing with the planned player group. All five require game-specific structured ingestion, validation, puzzle identity, approved scoring, and game-specific/combined standings before pilot acceptance. **Catalogue inclusion is a requirement, not proof that a parser or scoring method is working.** Other games (e.g., Connections, Quordle, Strands) remain later candidates.

### Initial five-game implementation coverage — current Phase 1 local POC

| Game | Pseudonymised WordleGroup share samples | Local parser evidence | Owner-approved score preview | Intended pilot |
|---|---:|---|---|---|
| Wordle | 116 | Wins, four real X/6 losses, malformed and extra-comment handling tested | `wordle-fixed-v1-approved` | REQUIRED — app integration pending |
| Minute Cryptic | 33 | Hint/par and emoji variants tested | `minute-cryptic-hints-v1-approved` (supersedes provisional par formula) | REQUIRED — app integration pending |
| FoxiMax | 70 | n/8, X/8, red tiles, rows/letters parsed; `needs_review` for mode/date | `foximax-original-n8-v1-approved` | REQUIRED — validation gates pending |
| Polygonle | 18 | 7/8 letter samples, pattern, win/loss and streak parsed; `needs_review` for mode/date | `polygonle-standard-v1-approved` | REQUIRED — validation gates pending |
| Krillion | 21 | Numerical score and opaque emoji trail parsed; `needs_review` for mode/date | `krillion-daily-absolute700-v1-approved` | REQUIRED — validation gates pending |

The 258 records are from the one undoubled WhatsApp export, not 258 confirmed real app submissions or authenticated identities. Earlier anonymised sample sets remain in regression tests and should **not** be blindly added to these counts. All score calculations are unawarded previews. Refer to §19 and the approved scoring contract in the accompanying ZIP.

**Pilot guardrail:** Do not claim five-game readiness from typed parsing alone. Unsupported/ambiguous shares must not receive points; all five need tested parsing and formally approved, versioned scoring before the planned five-game live pilot. League owners still choose a fixed subset of available supported games per season; the five-game catalogue does not mandate that every league selects all five.

**First-release capabilities:** Account/profile, public/private leagues, invitation/join flow, continuous membership, owner/delegated moderator/member roles, calendar/rolling seasons, automatic renewal, scheduled game/rule changes, game-specific + combined leaderboards, submission sharing/paste, results history and separate streak tracking, score approval, basic moderation/audit controls.

**Not MVP:** Member suggestions and league-wide voting, achievements/badges beyond essential historical winners, head-to-head modes, global ranking, native APK, image OCR, automatic scraping of games or privileged official integrations.

---

# 3. APPROVED LEAGUE & MEMBERSHIP RULES

## 3.1 Identity and memberships

- One user account and public nickname/profile; one user may join several leagues.
- A shared result is captured once and applied to every eligible league/season according to that league's game configuration.
- A league is a persistent community; a season is a bounded competition; a leaderboard is derived for that season.
- League visibility is **public or private**. Public leagues are discoverable; public league standings and public player nicknames are visible. Private leagues and standings require membership/invitation.
- A league owner may appoint moderators. The **owner controls season settings** and may selectively delegate privileges to moderators.
- Members may join mid-season and earn points from the **effective joining date onward**. No ordinary retroactive points for earlier puzzles.
- Before-joining historical submissions can be exceptionally counted with moderator/owner approval and an audit trail; historical entry and per-league award are distinct decisions.
- Leaving and rejoining must not erase submission history or reset puzzle uniqueness. More precise eligibility boundaries will be tested during implementation.
- A public league must support basic reporting, suspensions/removals and controlled rejoining.

## 3.2 Eligible games

- The league chooses a fixed selection of included games (typically four/five when catalog support exists; **no hard-coded minimum or maximum has been approved**).
- All selected games contribute to the combined competition. Skipped eligible puzzles award zero points.
- Individual game leaderboards coexist with a combined cumulative-points leaderboard.
- The game selection is frozen within the active season.
- Suggestion/voting features are **DEFERRED** but the model must allow future league proposals.

## 3.3 Seasons

- League owner can select **calendar-aligned or rolling** season schedules; weekly, monthly or custom duration may be configured subject to implementation feasibility.
- Default may be calendar monthly (proposed initial UX default), but both calendar and rolling must be supported.
- A season has preparation/scheduled, active, review/provisional, and finalised/archived lifecycle states.
- The next season starts **automatically**, copying the latest approved configuration unless scheduled amendments become effective.
- Approved game/rule changes apply to the next season by default, or a specifically scheduled later season. No surprise midseason rule modifications.
- A prior season may be in review while the new one is active; neither blocks the other.
- **Season finalisation is automatic** after the submission window and pending moderation reviews are resolved.
- Preserve immutable or auditable snapshots of each season's eligible games, scoring version and final standings.
- A late result can apply to the prior season when eligible and in the allowed window; distinguish puzzle date from submitted-at time.

## 3.4 Submission timing

- Recognised results can be submitted up to **48 hours after the relevant puzzle day ends**.
- Older results require approval by a moderator or owner.
- Puzzle-specific date/number should identify a daily challenge when reliable; timestamps and time zones should not be substituted for missing identifiers.
- League time zone is necessary for season boundaries; per-game puzzle date/time-zone policies require explicit parser tests.

---

# 4. APPROVED SCORING CONTRACT

## 4.1 Components

`awarded_total = performance_points + participation_points`

- An accepted eligible completed attempt earns **+1 participation point**, including a failed but completed attempt where the game's format supports it.
- Skipped/not-submitted puzzles award **0**.
- **Streaks are tracked separately and do NOT add championship points**.
- Overall season score is the **sum** of all eligible game points, not a daily average. Playing more of the selected games may earn more points.
- Retain component scores separately from total points for auditability and analytics.

## 4.2 Wordle — approved final score table

| Shared result | Performance | Participation | Total |
|---|---:|---:|---:|
| 1/6 | 10 | 1 | 11 |
| 2/6 | 8 | 1 | 9 |
| 3/6 | 6 | 1 | 7 |
| 4/6 | 4 | 1 | 5 |
| 5/6 | 2 | 1 | 3 |
| 6/6 | **1** | 1 | **2** |
| X/6 (completed failure) | 0 | 1 | 1 |
| Not played | 0 | 0 | 0 |

Do not revert 6/6 to zero performance points. Deduplicate `(account, game, puzzle identity)`; do not score multiple attempts.

## 4.3 Minute Cryptic — approved hint-only formula (2026-10-10)

`performance = max(0, 10 - hints_used)` for valid nonnegative integer hints; +1 participation for an accepted completed share. **Community-par difference and elapsed time are informational, not scoring inputs.** The old `clamp(10-hints+signed_under_par,0,10)` planning formula has been **SUPERSEDED** by explicit owner approval after review of same-day share examples that reveal the risk of double-counting hint efficiency. Rule version: `minute-cryptic-hints-v1-approved`. The parser still does not verify share authenticity or account/league eligibility.

## 4.3A Approved remaining initial-release game rules (2026-10-10)

- **FoxiMax** (`foximax-original-n8-v1-approved`): Original daily success 1/8→10, 2/8→9, 3/8→7, 4/8→6, 5/8→5, 6/8→4, 7/8→2, 8/8→1; X/8 completed failure→0 performance. Letter count is informational. /6-/7/training not approved by this contract.
- **Polygonle** (`polygonle-standard-v1-approved`): Regular daily 6–8-letter, six-attempt puzzles use Wordle's 10/8/6/4/2/1 performance table; 😔/6 completed failure→0. No word length or difficulty-mode bonus. Mini/custom/unlimited not approved.
- **Krillion** (`krillion-daily-absolute700-v1-approved`): Daily numeric reported score in integer 0–700; performance `min(10, (reported_score + 35) // 70)` (round to nearest whole, halves up); symbol trail informational. For a reported 440, performance=6 plus participation=1, total=7.
- All above get +1 participation **only after valid, completed, eligible acceptance**; skipped games earn zero. Scoring-rule approval is not submission approval. The owner also agreed to retain different typical game point distributions during the first pilot, monitoring fairness without reweighting or surprise midseason changes. Season rule versions must be snapshotted when the season engine exists.

## 4.4 Ranked scoring for future suitable games

- Game scoring methods: **fixed**, **formula**, or **ranked**.
- **Competition ranking (Option A)**: ties share rank; subsequent ranks skip occupied positions (e.g. 1,1,1,4,5).
- Rank-derived performance should be **normalised to 0–10**, plus the standard participation point, so league sizes can be compared.
- Precise normalisation function, no-submission treatment, ties and ranking freeze/deadlines need deterministic tests before enabling ranked games.
- Ranked scores are provisional until the result window closes. Do not implement a placeholder formula as though it were agreed.

---

# 5. RESULT SUBMISSIONS, APPROVAL & AUDIT

## 5.1 Ideal pipeline

`Share from original game → Android PWA share target / paste fallback → raw text capture → identify game → parse result → validate puzzle identity & fields → user confirmation → server-side duplicate/eligibility checks → accept or queue review → score per eligible league → leaderboard updates → audit trail`

- Do not require a user to submit separately to each league.
- Parser output should distinguish `recognized_valid`, `unrecognized`, `invalid`, `ambiguous`, `duplicate`, `needs_review`; precise API naming can evolve.
- Store original text safely; sanitize displayed content. Preserve both exact input and structured interpretation with parser/version metadata where appropriate.
- Parser cannot prove authenticity: plain-text shared results may be edited. Public competitions are fundamentally trust-based without official verification.

## 5.2 Moderator workflow

| Situation | Rule |
|---|---|
| Recognised new in-window valid submission | Auto-accept when all checks pass |
| Duplicate same user/game/puzzle | Do not award again; flag/reject as appropriate |
| Unrecognised/ambiguous share | Moderator or owner must approve; no score while pending |
| Historical/backdated import outside standard window | Moderator or owner approval |
| Score correction/replacement | Moderator or owner approval; append audit record, preserve original |
| Suspected manipulation | Flag for moderation; avoid silent changes |
| Result spanning multiple leagues | Submission validity and each league's score eligibility can be reviewed separately |
| Administrator's own disputed correction | Independent reviewer where possible; unresolved solo-owner procedure remains implementation detail |

- Audit entries capture actor, action, affected result/league, old/new value, rationale and timestamp.
- Approvals are backend-enforced and, where possible, irreversible only through another audited adjustment.

---

# 6. APPROVED TECHNICAL ARCHITECTURE (SELECTED; CLOUD COMPONENTS NOT INSTALLED)

**Owner decision (2026-10-10): APPROVED as the official technology direction, not proof of deployment.**

| Responsibility | Approved choice | Verified implementation status |
|---|---|---|
| Frontend | React + TypeScript + Vite | Local placeholder UI running in Windows browser; no user-facing league features yet |
| Local runtime / tools | Node.js 24 LTS, npm, Git, Python; Linux VMware primary | Windows baseline §21; Linux runtime and checks in §25 |
| Backend execution | Supabase server-side functions for trusted scoring, eligibility and writes | Approved, **NOT CREATED** |
| Database and authentication | Supabase PostgreSQL + Supabase Auth | **Local schema and Auth/profile trigger migrated/tested; direct local HTTP signup/login/profile/delete PASS**. Frontend login, managed cloud Auth and production sessions NOT IMPLEMENTED |
| Data security | PostgreSQL RLS, server-side authorisation and uniqueness constraints | Initial constraints and versioned RLS read/league role policies **implemented, local SQL role simulations PASS**. Real-user-JWT HTTP policy/RPC checks and comprehensive security review remain NOT TESTED |
| Hosting | Cloudflare Pages | Approved, **NOT DEPLOYED** |
| Version control | Local Git and private GitHub repository | **Windows + Linux SSH verified; Linux `main` pushed through `1e9f216`, clean `origin/main` tracking** |
| Testing / quality | Strict TypeScript, Vitest, Oxlint, production build, preservation tests | Linux `npm run check` **93/93 PASS** after Block 2, SQL structural/Auth/profile/RLS/permission tests PASS at stated scopes; GitHub-hosted CI NOT VERIFIED |
| Mobile target | Android-first installable PWA + paste fallback | Target approved; manifest/service worker/Share Target **NOT IMPLEMENTED / NOT TESTED** |

**Development principles:** Start on available free tiers where practical; check quotas, billing and operational limitations before creating services or upgrading plans. Do not store Supabase service-role credentials or any server-only secrets in the client bundle, `VITE_` environment variables, committed code, or public documentation. Treat scoring, uniqueness, season eligibility and moderation as trusted server responsibilities. Preserve the existing Phase 1 Python research as evidence while planning a controlled production parser integration later.

### Logical entities — six `public` tables plus a private delegation table; remaining entities design-only

**Migrated local `public` tables:** `profiles`, `leagues`, `league_memberships`, `games`, `game_puzzles`, `result_submissions` (initial migration `20261012170000_phase3_block1_core_schema.sql`). **Additional migrated private table:** `app_private.league_moderator_delegations` (Step 6), plus `app_private` authorisation helpers, public RPC wrappers and read-only RLS policies (Steps 5–6). **Proposed/design-only:** `parser_versions`, `scoring_rule_versions`, `league_seasons`, `season_game_settings`, `league_score_entries`, `approval_requests`, `approval_decisions`, `result_audit_events`, `scheduled_rule_changes`, `moderation_reports`. Current tables do not constitute an operational submission/season engine.

**Integrity objectives:** Idempotent result ingestion and scoring; duplicate-safe automatic season renewal; immutable season rule snapshots; explicit membership eligibility; per-league permissions; proper foreign keys/unique constraints; versioned scoring; safe audit/reversal paths.

---

# 7. IMPLEMENTATION PHASE TRACKER — CHAT STRUCTURE

**ACTIVE METHOD (supersedes original chat/block cadence on 2026-10-14):** Build whole features as **one integrated phase package**, then run **one consolidated owner verification/acceptance gate** at the end. Internal developer tests, automatically gated migrations, pre-change backups and safe fail-fast commands still apply. Only actual failures, essential design decisions, credentials/external provisioning, or irreversible actions should interrupt the package-first flow. A phase may require a follow-up fix, and the real-world pilot may span calendar days; never claim a phase passed before it does. Historical Phase 0–3 block records are retained for audit, but the old Phase 4–9 block allocations are superseded. **§27 retains the approved accelerated scope; §30 controls current status and next action.**

| Phase | Active milestone | Implementation packages remaining | Status |
|---|---|---:|---|
| 0 | Product definition and requirements | 0 | **COMPLETE** |
| 1 | Five-game parsing/scoring local POC | 0 | **COMPLETE / PASS (local POC)** |
| 2 | Application architecture and repository foundation | 0 | **COMPLETE / PASS (local)** |
| 3 | **Database security, audit and recovery** | **0** | **COMPLETE / PASS (local); commit `9b5a40a`, clean/pushed** |
| 4 | **Complete competition backend:** results, scoring, leagues, memberships and seasons | **1 consolidated package** | PLANNED |
| 5 | **Mobile PWA and competition experience:** Android sharing, rankings/history and moderation workflows | **1 consolidated package** | PLANNED |
| 6 | **Production deployment, integrated assurance, pilot and MVP stabilisation** | **1 integrated delivery programme** | PLANNED; live pilot can require further real-world validation |

**Remaining: THREE phases/programmes (4–6); Phase 3 is completed locally.** Packaging and user verification are consolidated, but phase exit criteria and safeguards are not relaxed.

**Historical tracker (SUPERSEDED, for audit only):**

| Phase | Name | Planned chats/blocks | Status |
|---|---|---:|---|
| 0 | Product Definition & Requirements | Previous planning conversations | **COMPLETE (requirements baseline)** |
| 1 | Real Share Samples & Parser Proof of Concept | 3 chats × 3 steps (Block 3 explicitly authorised) | **COMPLETE / PASS — LOCAL POC ONLY, 76/76 tests** |
| 2 | App Architecture & Local Repository Foundation | 2 chats × 3 steps | **COMPLETE / PASS — both blocks, 2026-10-11; local commit `4f0220e`** |
| 3 | Database, Accounts & Security Foundation | 3 chats × 3 steps (historical allocation; consolidated final delivery) | **COMPLETE / PASS locally 2026-10-14; commit `9b5a40a`** |
| 4 | Game Results API, Validation & Scoring | 3 chats × 3 steps | PLANNED |
| 5 | Leagues, Membership & Season Engine | 3 chats × 3 steps | PLANNED |
| 6 | PWA User Interface & Android Share Target | 3 chats × 3 steps | PLANNED |
| 7 | Moderation, Rankings, Audits & History | 3 chats × 3 steps | PLANNED |
| 8 | End-to-End Testing, Security & Deployment | 3 chats × 3 steps | PLANNED |
| 9 | Pilot Season, Stabilisation & MVP Release | 2 chats × 3 steps | PLANNED |


**Decision recorded 2026-10-14:** The owner explicitly replaces the previous phase/block cadence with the accelerated four-phase remainder. The older task list below is retained as historical scope traceability, not a directive to schedule the old 18 blocks.

## Phase 0 — Product Definition & Requirements
**Status: COMPLETE — design only**
- [x] Public/private league model and roles agreed
- [x] Multiple league memberships and one submission across eligible leagues
- [x] Wordle performance + participation scoring agreed
- [x] Minute Cryptic provisional scoring method agreed, pending sample verification
- [x] Ranked scoring approach, competition ties and 0–10 normalisation principle agreed
- [x] Combined and game-specific championship model agreed
- [x] Calendar/rolling seasons, automatic renewal and scheduled changes agreed
- [x] Midseason joining, 48-hour late window, review/approval rules agreed
- [x] Android share plus paste fallback selected
- [x] Public standings visibility, auto finalisation and historical exception approval agreed
- [ ] Real game share formats confirmed (**Phase 1**)
- [ ] Technical stack actually created/deployed (**later phases**)

## Phase 1 — Real Share Samples & Parser Proof of Concept
**Status: COMPLETE / PASS at LOCAL POC scope: Steps 1–9 across three authorised blocks, 76/76 tests. Identity/date/mode authentication and live integration are explicitly NOT COMPLETE.**

### Block 1 / Chat 1 — Steps 1–3 (START HERE)
1. **Collect and inspect genuine share samples:** at least one real Wordle and one real Minute Cryptic share, without inventing fields. Prefer variants (win/loss, different hints/par). Clarify privacy handling and save anonymised fixtures.
2. **Define the parser contract:** inputs, per-game typed output, validation/error states, puzzle identity, and safe handling of unsupported/ambiguous formats.
3. **Implement a minimal local parsing prototype:** parse verified sample strings, output structured results, no account/database/web UI dependencies; execute initial positive/negative tests.

**Block 1 exit:** Real samples documented; parser input/output contract saved; prototype runs locally with demonstrated tests. If samples unavailable, only complete research/schema design and leave parsing tests BLOCKED/NOT TESTED, not PASS.

### Block 2 / Chat 2 — Steps 4–6
4. Expand genuine/anonymised test fixtures and parser coverage: Wordle X/6 and malformed cases; Minute Cryptic hints/par variants; **FoxiMax, Polygonle and Krillion** typed structures and observable edge cases. Prioritise verifiable format parsing; record any unconfirmed field semantics instead of guessing.
5. Implement versioned pure Wordle scoring and cautiously provisional Minute Cryptic scoring with tests. **Document three new games' proposed scoring contracts and outstanding approval questions; do not assign unapproved formulas.** Any completed extra-game scoring test must be explicitly reported as such, separate from existing results.
6. Test puzzle identity and duplicate policy across all five game formats wherever observed; distinguish parsing from server-enforced uniqueness; document unknown game-date mappings, unsupported formats and moderation routes. Leave unverified cases pending review.

### Block 3 / Chat 3 — Steps 7–9 (authorised and verified 2026-10-10)
7. **Approve all five policy/fairness decisions:** DECIDED by owner's "agreed with all". Wordle unchanged; Minute Cryptic hint-only replaces previous provisional formula; FoxiMax, Polygonle, Krillion rule mappings approved; sample-average differences accepted for first pilot.
8. **Implement versioned local approved score previews:** `scoring.py` v1 rule IDs; integer rounding and boundary checks; score preview cannot award/accept. PASS.
9. **Run full regressions and close local parser POC gate:** 76/76 Python unit tests PASS; 258 pseudonymised shares evaluated through all five approved preview functions, zero awards. Explicitly document date/mode/puzzle-ID verification gaps and backend/Android gates. PASS at **local prototype** scope only.

**Phase 1 exit:** **PASS (local POC only)** — versioned parser 0.4.0-poc, reproducible tests, five typed observed share formats, approved scoring versions, unsupported-format guards, identity candidates and safe review disposition. This does NOT approve the app for live use. Real trusted server enforcement, authenticated identities, puzzle date/mode validation, late-window processing and PWA/Android testing remain later-phase acceptance gates.

## Phase 2 — App Architecture & Local Repository Foundation
**Status: COMPLETE / PASS (2026-10-11).** Block 1 Steps 1–3 validated 2026-10-10; Block 2 Steps 4–6 validated 2026-10-11 on the owner’s Windows PC. See active §23; §22 is the historical prepared snapshot.
- [x] Block 1 / Steps 1–3: Official stack approved; working Windows development tools and repo; strict TypeScript/test/build baseline; browser display verified; local first commit `3f87610`.
- [x] Block 2 / Step 4: Modules organised into `src/ui/`, `src/domain/games/`, type-only `src/domain/results/`, `src/config/` and reserved `src/infrastructure/`. No parser port or backend integration.
- [x] Block 2 / Step 5: Public-only local/test/production stage validation, `.env.example`, secret-handling docs and safe Git config checks implemented and tested on Windows. No backend/cloud credentials created.
- [x] Block 2 / Step 6: Local `npm.cmd ci` PASS; full `npm.cmd run check` PASS (93/93 tests, typecheck/lint/build); Windows local browser confirmed; CI YAML and onboarding docs added; staged review clean; local Git commit `4f0220e`, clean `main`. **GitHub-hosted CI execution remains NOT RUN**, not part of the local Phase 2 acceptance claim.
- **Phase 2 exit:** **PASS for local development foundation** — clean Git, repeatable Windows install/start/checks, defined module/config boundaries, CI specification and handover. A running placeholder is **not** a functional league app or a verified remote CI run.

## Phase 3 — Database, Accounts & Security Foundation
**Status: COMPLETE / PASS (local scope, 2026-10-14)**. Phase 3 Blocks 1–2 were previously verified; all outstanding audit, real HTTP/JWT authorization, migration/recovery and restore obligations completed in one consolidated package. Source committed/pushed `9b5a40a`, clean `main...origin/main`. See **§30 (current)** and §29 (pre-commit evidence).
- [x] Block 1 / Steps 1–3: Initial migration/data model, keys/constraints, local structural tests and repeatability, committed and pushed as `20d008c`. Local scope only.
- [x] Block 2 / Step 4: Versioned `auth.users`→`public.profiles` lifecycle migration, SQL trigger/privacy/cascade tests, direct Supabase Auth HTTP signup/login/profile/delete smoke tests; committed/pushed `5d5fb10`.
- [x] Block 2 / Step 5: Least-privilege anonymous/authenticated **SELECT-only** RLS policies (public games/leagues, own profile, private league owner/active member, own membership history) and local SQL role simulations; committed/pushed `f01f953`. HTTP-level policy verification subsequently PASS in consolidated Phase 3; see §29–30.
- [x] Block 2 / Step 6: Owner-only moderator appointment and narrowly explicit `view_member_roster` delegation, revocation, demotion/re-promotion and per-league isolation with rollback-only SQL checks; committed/pushed `1e9f216`. Join/leave/invite flow remains Phase 5; no direct client table writes enabled. HTTP-level RPC/role verification subsequently PASS in consolidated Phase 3; see §29–30.
- [x] Consolidated completion / former Block 3 Steps 7–9: Versioned audit/approval infrastructure and immutable histories; signed-in HTTP/JWT RLS and RPC positive/negative scenarios; a safe forward-only fifth migration; full backup and independent app-schema restore verification; regressions and recovery tooling PASS on owner VM; 13 files committed and pushed as `9b5a40a`.
- **Phase 3 exit: MET / COMPLETE / PASS for local implementation, local security/recovery tests and Git source closeout.** Cloud operations, hosted CI, app features and pilot are future gates.

## ARCHIVED original Phase 4 — Game Results API, Validation & Scoring
**Status: PLANNED**
- Block 1 / Steps 1–3: Submission API; parser integration; immutable raw capture/versioning.
- Block 2 / Steps 4–6: Scoring rule versions; participation and per-game score engine; duplicate prevention.
- Block 3 / Steps 7–9: League allocation/eligibility; correction semantics; automated API tests.
- **Exit:** One result is scored exactly once per eligible league with reproducible tests.

## ARCHIVED original Phase 5 — Leagues, Membership & Season Engine
**Status: PLANNED**
- Block 1 / Steps 1–3: Public/private creation; invitation/join/leave; roles.
- Block 2 / Steps 4–6: Calendar/rolling seasons; frozen rule snapshots; scheduled modifications.
- Block 3 / Steps 7–9: Automatic renewal idempotency; late submission handling; season review/finalisation.
- **Exit:** Two or more simulated seasons run without data loss or duplicate creation.

## ARCHIVED original Phase 6 — PWA User Interface & Android Share Target
**Status: PLANNED**
- Block 1 / Steps 1–3: Mobile navigation/profile; leagues/game results screens; accessible UI.
- Block 2 / Steps 4–6: PWA manifest/install; Android share target; paste fallback and result preview.
- Block 3 / Steps 7–9: Real Android device tests; offline/failure handling; responsive polish.
- **Exit:** Actual Android Share → PWA → confirmed submission works on tested configuration; paste remains available.

## ARCHIVED original Phase 7 — Moderation, Rankings, Audits & History
**Status: PLANNED**
- Block 1 / Steps 1–3: Review queue and corrections; permission/audit checks; owner self-review safeguards.
- Block 2 / Steps 4–6: Per-game and combined standings; separate streak statistics; ranked scoring where fully defined.
- Block 3 / Steps 7–9: Historical imports; archived champions; public/private visibility and abuse controls.
- **Exit:** Pending result never scores early; authorised corrections are auditable; leaderboards reconcile.

## ARCHIVED original Phase 8 — End-to-End Testing, Security & Deployment
**Status: PLANNED**
- Block 1 / Steps 1–3: Integration/security/abuse tests; backup/restore plan; accessibility/browser checks.
- Block 2 / Steps 4–6: Production hosting/config/secrets; domain/HTTPS; deployment migration tests.
- Block 3 / Steps 7–9: Recovery and monitoring; release checklist; production-readiness gate.
- **Exit:** Stable deployment with validated security, backups and share fallback.

## ARCHIVED original Phase 9 — Pilot Season, Stabilisation & MVP Release
**Status: PLANNED**
- Block 1 / Steps 1–3: Small pilot (about 5–10 players) with the **five approved games** offered for selection after passing format, scoring, identity and ingestion gates; real cross-league submissions; collect per-game issues.
- Block 2 / Steps 4–6: Correct defects; run season boundary/finalisation; document first MVP release.
- **Exit:** Evidence-backed pilot acceptance and updated operating guide.

---

# 8. DECISION LOG — ACCEPTED PRODUCT DECISIONS

| Date | Decision | Status |
|---|---|---|
| 2026-10 | Public and private leagues, multi-membership | DECIDED |
| 2026-10 | Public league standings visible; private standings restricted | DECIDED |
| 2026-10 | Share directly via Android where supported, paste fallback | DECIDED |
| 2026-10 | Wordle and Minute Cryptic are original Phase 1 Block 1 parser targets | DECIDED; BLOCK 1 POC VERIFIED |
| 2026-10-10 | **Add FoxiMax, Polygonle and Krillion to first-release/pilot supported catalogue (five games total)** | **DECIDED — implementation NOT YET VERIFIED** |
| 2026-10-10 | Preserve original Block 1 test scope and defer new-game scoring-rule approval; new formats must be parsed/tested before live pilot | DECIDED SCOPE CONTROL; scoring UNKNOWN |
| 2026-10 | Per-game and combined rankings | DECIDED |
| 2026-10 | One global per-user/per-puzzle submission applied to eligible leagues | DECIDED |
| 2026-10 | Fixed selected games per season; skipped games zero | DECIDED |
| 2026-10 | Performance +1 participation; streaks separate | DECIDED |
| 2026-10 | Wordle performance 10/8/6/4/2/1; X/6=0; skipped=0 | DECIDED |
| 2026-10 | Minute Cryptic early `clamp(10-hints+signed_under_par,0,10)` planning formula | SUPERSEDED 2026-10-10 — never awarded |
| 2026-10 | Combined scoring adds eligible games rather than averaging | DECIDED |
| 2026-10 | Competition ranking (ties 1,1,1,4) | DECIDED |
| 2026-10 | Normalised 0–10 ranked performance (exact mapping unapproved) | DECIDED PRINCIPLE |
| 2026-10 | Midseason joining, score from joining date forward | DECIDED |
| 2026-10 | Historical exceptions with independent league approval | DECIDED |
| 2026-10 | 48-hour late result period | DECIDED |
| 2026-10 | Unrecognised result and score correction need moderator+ approval | DECIDED |
| 2026-10 | Owner controls season config and can delegate to moderator | DECIDED |
| 2026-10 | Calendar and rolling seasons | DECIDED |
| 2026-10 | Automatic season renewal | DECIDED |
| 2026-10 | Scheduled changes: next season by default or later selected season | DECIDED |
| 2026-10 | Automatic finalisation after deadlines and moderation completion | DECIDED |
| 2026-10 | Proposals and game voting deferred until later release | DEFERRED |
| 2026-10 | Small, independently verifiable phase chats with updated Markdown checkpoint | DECIDED |
| 2026-10-10 | User explicitly accepted all five recommendations: Minute Cryptic `max(0,10-hints)`; FoxiMax original /8 table; Polygonle standard six-guess Wordle table; Krillion daily 0–700 rounded absolute conversion; unequal average points allowed in initial pilot | **DECIDED — rule versions activated in isolated POC previews** |
| 2026-10-10 | Additional Phase 1 Block 3 / Steps 7–9 approved; local POC passed all 76 tests | DECIDED / VERIFIED LOCAL POC ONLY |
| 2026-10-10 | Owner approves React + TypeScript + Vite frontend; Supabase Auth + PostgreSQL + RLS + server functions; Cloudflare Pages hosting; local Git and planned private GitHub; Android-first PWA | **DECIDED TECH STACK; cloud/backend/deployment still NOT IMPLEMENTED** |
| 2026-10-10 | Phase 2 Block 1 Windows foundation verified (npm installation, TS/lint/3 Vitest/build/browser), 4 offline preservation tests, clean Git initial commit `3f87610` | **VERIFIED / BLOCK 1 COMPLETE** |
| 2026-10-11 | Phase 2 Block 2 module separation, config/secrets safeguards, CI specification and Windows onboarding; owner verified 8/8 offline Node, 76/76 research Python, 9/9 Vitest, TypeScript/lint/build, browser; committed `4f0220e` with clean tree | **VERIFIED / PHASE 2 COMPLETE (LOCAL FOUNDATION)** |
| 2026-10-12 | Linux VMware retained as primary development environment and **local** PostgreSQL/Supabase database host; Windows retained as secondary, GitHub selected as private source-of-truth repository with independent SSH credentials for Windows and Linux | **OWNER DECIDED / SSH AND PUSH VERIFIED** |
| 2026-10-12 | Phase 3 Block 1 six-table schema and deny-default RLS metadata, local SQL validation and repeated migration reset, Linux 93/93 project checks, eight-file commit `20d008c` pushed to private GitHub `main` | **VERIFIED / PHASE 3 BLOCK 1 COMPLETE (LOCAL FOUNDATION)** |
| 2026-10-13 | Phase 3 Block 2 Step 4 minimal non-identifying profile trigger and Auth HTTP smoke test: signup, password login, `/auth/v1/user`, linked profile and disposal; `auth.users` email not copied to public profile | **VERIFIED LOCALLY / COMMIT `5d5fb10`; no frontend login UI** |
| 2026-10-13 | Phase 3 Block 2 Step 5 least-privilege read-only RLS: public games/leagues; self profile/history; private league owners/active members; SQL simulated roles and explicit deny on client writes/submission tables | **VERIFIED SQL SCOPE / COMMIT `f01f953`; HTTP RLS NOT TESTED** |
| 2026-10-13 | Phase 3 Block 2 Step 6 owner-appointed moderators with selectively delegated `view_member_roster`; role/delegation isolation, revocation, demotion and former-member cases tested; no join/leave or direct client writes | **VERIFIED SQL SCOPE / COMMIT `1e9f216`; HTTP permission RPC NOT TESTED** |
| 2026-10-13 | Three commits pushed to private GitHub `main`, final `HEAD=origin/main=1e9f216` clean; local regressions 93/93 PASS; Phase 3 Block 2 closed within verified scope, Block 3 security and recovery gates remain | **VERIFIED / BLOCK 2 COMPLETE / PASS (LOCAL); PHASE 3 IN PROGRESS** |

| 2026-10-14 | Owner explicitly replaces the remaining 18 short blocks / old Phases 4–9 with FOUR integrated phases (3 completion, 4 backend, 5 PWA/experience, 6 deployment/pilot). Deliver complete code in first substantive implementation reply; consolidate owner verification at phase end, preserving safety and evidence gates. | **DECIDED — WORKFLOW/ROADMAP CHANGE, NOT FEATURE IMPLEMENTATION** |

---

# 9. OPEN ITEMS & VALIDATION RISKS — UPDATED 2026-10-13

**Resolved at Phase 1 local POC:** observed Wordle X/6 losses; several Minute Cryptic hint/par variants; FoxiMax X/8 and red tiles; Polygonle standard wins/failures and 7–8-letter samples; Krillion reported values 0–700 handling; all five score rules and pilot cross-game average differences **APPROVED**, 76/76 local tests PASS.

**Still NOT VERIFIED (do not silently convert to implementation):**
- External authenticity of any user-shared text, real account ownership or sender authentication.
- Daily puzzle date/number mapping and cross-timezone calendar rules. Wordle, FoxiMax, Polygonle and Krillion samples present numbered identities with missing verified dates. WhatsApp timestamps must never stand in for puzzle dates. Minute Cryptic dates are self-reported within share text, not independently verified.
- FoxiMax original daily vs training/variant; Polygonle daily vs unlimited/custom/modes and unsupported mini; Krillion daily vs other mode. The observed share alone cannot prove the intended mode. Extra games remain `needs_review`; score previews are NOT acceptance.
- Unseen future share variants (especially 6-letter Polygonle, additional Minute Cryptic outcome icons or failed-result format, Krillion symbol semantics). Unknown formats remain review-only, no points.
- **Partially resolved in Phase 3 Block 2:** local Supabase Auth HTTP signup/login and automatic email-free profile PASS. SQL-executed RLS policies and owner/moderator/member delegation cases PASS under simulated roles/JWT claims. **Still NOT VERIFIED:** anonymous/authenticated PostgREST HTTP data access using actual independently signed-in user tokens; HTTP-level mutation/RPC restriction and cross-league abuse tests; comprehensive adversarial/least-privilege verification; application-integrated login and session management. Structural keys exist, but real result eligibility, membership-date checks, 48-hour late submissions, moderator *review decisions*, season snapshots and audited score corrections are NOT IMPLEMENTED.
- Actual Android installed PWA Share Target and paste fallback, hosting/HTTPS, deployed site, platform compatibility and security.
- Exact custom/rolling-month season boundaries; historical exceptions and owner self-approval exception; finalisation corrections.
- Architecture selection, local module boundaries, documented environment/secrets convention and Windows/Linux local automated checks are **RESOLVED / VERIFIED at their scopes**. Private GitHub SSH, remote push and history reconciliation are **VERIFIED**; latest known Linux source commit `1e9f216`. Four local versioned database migrations are registered and the new Block 2 SQL cases pass. **Still NOT VERIFIED:** managed Supabase cloud project, Cloudflare deployment, actual GitHub-hosted CI run result, comprehensive secret review, complete API-level policy/role security, backup/restore and non-destructive migration recovery. Ranked scoring normalisation remains reserved for later ranked games, not the initial five fixed/absolute policies.

**Pilot gate:** Still NOT READY. Local parser/scoring POC PASS is NOT a live acceptance gate. The later project phases must validate integration before any actual member points are awarded.

---

# 10. HISTORICAL VERIFIED IMPLEMENTATION STATE — SNAPSHOT 2026-10-13 (SUPERSEDED BY §30)

| Component | State |
|---|---|
| Product requirements | Phase 0 baseline agreed, plus five-game scope and approved scoring |
| Latest guide | **Historical snapshot (v2.4, 2026-10-13)**; current state is **v2.8 / §30**, with Phase 3 complete locally |
| 258 pseudonymised WordleGroup shares | Wordle 116; Minute Cryptic 33; FoxiMax 70; Polygonle 18; Krillion 21; from 432-message WhatsApp export; NOT independently authenticated |
| Additional older anonymised sample fixtures | Preserved for regression, not summed into 258 without proven distinctness |
| Parser | Python `parser.py` **0.4.0-poc**, typed observed formats, safe status handling, no server input trust |
| Approved performance scoring | Python `scoring.py` with five **v1-approved** rule versions, preview only |
| Historical policy/candidates | `scoring_v0_historical.py` and `scoring_candidates.py` preserved, inactive |
| Test suite | **76/76 PASS**, no failures; 52 inherited/current historical + 24 new approved-rule tests |
| Full five-game POC score preview | 258/258 structurally typed corpus results tested, 0 accepted, 0 awarded; 109 FoxiMax/Polygonle/Krillion review-only |
| Puzzle identity | Candidate key extraction tested; actual date/mode verification and backend deduplication NOT IMPLEMENTED |
| Git repository/local app structure | Preserved `main` history through `20d008c` → `5d5fb10` → `f01f953` → **`1e9f216`**, verified pushed to private `git@github.com:Cupitum/puzzle-league.git`; Linux `HEAD=origin/main=1e9f216`, `git status` clean. Windows secondary checkout last verified at `4f0220e`; not confirmed pulled. |
| Backend/database/auth | Six core `public` tables and five-game catalogue, plus private moderator-delegation table and helper/wrapper functions **migrated/tested locally** on Linux Supabase Docker; four registered migrations. Auth HTTP signup/login/profile lifecycle PASS. Public/private RLS read policies, owner/moderator roster delegation, revocation/demotion PASS under simulated SQL roles. **No frontend login, integrated client/API security test, result-scoring service or cloud backend deployment.** |
| Local CI and tests | Latest owner Linux `npm run check` **93/93 PASS** (8 Node, 76 Python, 9 Vitest), TypeScript PASS, Oxlint 0 issues, Vite v8.3.4 production build PASS (18 modules), 2026-10-13 after Step 6. Block 1 SQL structural checks PASS after resets; Step 4 SQL+HTTP Auth tests PASS; Step 5/6 role-simulated SQL tests PASS with ROLLBACK. **Actual hosted GitHub Actions, real-JWT HTTP RLS and role-RPC checks NOT VERIFIED.** |
| League/season engine | NOT STARTED |
| Frontend/PWA/Android Share | **Owner confirmed reorganised React/Vite placeholder starts in Windows browser;** Phase 2 full Windows check: TS PASS, Oxlint 0 warnings/errors, Vitest **9/9 PASS**, Vite production build PASS (18 modules). **No PWA install/Share Target, submission actions or real league UI tested** |
| Hosting/deployment | Cloudflare Pages owner-approved but **NOT DEPLOYED**; local Supabase database running on Linux, **managed Supabase cloud project NOT CREATED / VERIFIED** |
| Pilot | NOT STARTED / NOT READY |

---

# 11. PHASE COMPLETION TEMPLATE

Copy into this guide when completing a phase/block:

```
## Phase [N], Block [M] — [Title]
**Status:** COMPLETE / IN PROGRESS / BLOCKED
**Date:** YYYY-MM-DD
**Scope:** Steps [x–y]
**Objective:** ...
**Files/code changed:** ...
**Database/schema/migrations changed:** ... (or NONE)
**Tests & evidence:**
- Test: ... | Expected: ... | Actual: ... | PASS/FAIL/NOT TESTED
**Known problems/limitations:** ...
**Decisions taken:** ...
**Deferred:** ...
**Next action:** Phase [N], Block [M+1], Steps [...]
**Actual technical state:** ...
```

At each checkpoint, update the header, phase table, latest evidence and handover text. Prefer a newly dated filename containing the last COMPLETE and next START markers. Don't remove old verified evidence simply to shorten the file.

---

# 12. NEW-CHAT HANDOVER PROCEDURE — ACCELERATED METHOD (ACTIVE)

1. Start each remaining phase in a new chat using this latest guide and **actual current commit/source**; inspect the code and schema before authoring. Phase 3's current last verified GitHub commit is `1e9f216`.
2. **First substantive implementation reply:** create a downloadable **complete phase ZIP/patch** and explain its contents, ordering, environment requirements, safe apply procedure and the **single consolidated test/verification command**. Include executable source, SQL migrations, scripts, tests and concise documentation; do not split code across many incremental replies. If truly essential prerequisites are absent, first resolve only those prerequisites and identify exactly what is missing.
3. Implement a **safe execution workflow**: source state/commit guard, secret-safe configuration, backups when needed, ordered forward-only migrations, no overwriting applied migrations, fail-fast on error, rollback/restore guidance. Never use a destructive local reset or production data deletion merely to simplify testing.
4. Author-side testing/review happens while preparing the artifact. **Owner-side verification occurs at the end** of the integrated phase run: one bundled check covering SQL/function/HTTP tests, the existing `npm run check` pipeline, security regressions and staged Git hygiene, plus device/cloud/manual gates where appropriate. A failed gate is investigated and fixed; it is not silently ignored.
5. **After actual PASS:** review diff and sensitive data, commit/push via original Git history, record output and update authoritative `.md` checkpoint. Keep `NOT TESTED` or `BLOCKED` wherever real evidence is absent. Do not conflate source push with GitHub Actions success.
6. Keep future product rules and the five approved game scoring contracts unchanged unless the owner decides otherwise. A phase is not PASS merely because its package was delivered.

### ARCHIVED STARTER PROMPT — FIRST IMPLEMENTATION CHAT (SUPERSEDED: USE §15 INSTEAD)

> We are continuing the **Puzzle League** app project. I have uploaded the authoritative file `Puzzle_League_Project_Guide_REQUIREMENTS_COMPLETE_PHASE1_START_2026-10-10.md`. Read and follow it as the authoritative checkpoint. Phase 0 (product requirements) is COMPLETE; implementation has NOT STARTED. Start **Phase 1 — Real Share Samples & Parser Proof of Concept, Block 1 / Steps 1–3 ONLY**. Step 1: inspect authentic Wordle and Minute Cryptic share samples (ask me to paste real samples if not attached; do not invent them). Step 2: agree a typed parser contract and error/approval states. Step 3: build a minimal local parser and show reproducible tests against the verified samples. Do not start the database, account system, PWA or unrelated phases. Work in small verifiable steps. At the end, update the guide with actual results and provide a newly dated `.md` checkpoint for the next chat.

---

# 13. IMMEDIATE NEXT ACTION

**CURRENT AS OF v2.5: Phase 0–2 COMPLETE, Phase 3 foundation/Auth/RLS/role controls implemented at verified local scopes; last verified GitHub commit `1e9f216`, clean. **Accelerated four-phase roadmap DECIDED**: Phase 3 consolidated completion package NEXT, followed by Phases 4–6. §27 controls the next implementation chat; §26 is the archived prior handover.** The older paragraph below remains historical early-Phase-1 context, superseded by §§19 and 26.

The additional Sep 6–7 messages brought the in-scope fixture collection to **17** results (8 Wordle; 2 Minute Cryptic; 3 FoxiMax; 2 Polygonle; 2 Krillion). Continue collecting genuine edge cases, especially Wordle X/6, Minute Cryptic par/hint distinctions, FoxiMax failure/completion, variable-length Polygonle and Krillion symbolic variants. All sender identities in the new distribution have been anonymised. Typed parsing does not prove game outcome or award points. No Android integration has been demonstrated.

**Golden rule:** preserve decisions, verify actual behavior, and leave an auditable checkpoint between chats.


---

# 14. PHASE 1 BLOCK 1 — INTERIM EVIDENCE CHECKPOINT (2026-10-10)

**Status:** HISTORICAL INTERIM SNAPSHOT (SUPERSEDED by the later Block 1 completion evidence below). **Not the current checkpoint.**

**Scope:** Steps 1–3 only.

**Step 1 (historical snapshot before samples were provided):** Reviewed authoritative guide. At that earlier checkpoint no genuine Wordle or Minute Cryptic share text had yet been supplied. Both fixtures remain NOT PROVIDED / NOT VERIFIED. Requested complete copied text preserving line breaks, emojis, puzzle IDs, dates, hint/par fields.

**Step 2:** NOT STARTED. Parser contract must be grounded in observed shares; distinguish recognised valid, unrecognised, invalid, ambiguous, duplicate, and needs-review conditions. Do not infer missing puzzle identity or award points in ambiguous cases.

**Step 3:** NOT STARTED. No parser files created, no execution or test results claimed.

**Tests & evidence:** Real share inspection NOT TESTED; parser positive tests NOT TESTED; parser negative tests NOT TESTED.

**Files changed:** This Markdown guide only. **Database/schema/migrations:** NONE. **Local repository:** NOT VERIFIED.

**Historical next action (now superseded by completed Block 1):** User supplies one authentic Wordle and one authentic Minute Cryptic share. Inspect and document exact formats; agree typed parser contract; create isolated prototype and run positive/negative tests. Do not start Phase 1 Block 2 or any later phase. At actual Block 1 completion, revise this checkpoint with real fixture evidence, code paths, commands and test output; then hand over to Phase 1 Block 2 Steps 4–6 in a new chat.


---

# 14. LATEST EVIDENCE — PHASE 1 BLOCK 1 / STEPS 1–3

**Status:** COMPLETE at local proof-of-concept level, 2026-10-10. **Phase 1 as a whole remains IN PROGRESS.**

**Step 1 — supplied share inspection:** 12 WhatsApp messages separated, of which 10 are puzzle results and 2 are chat only. Wordle 2 (same puzzle 1936, 5/6 and 4/6); Minute Cryptic 1 (2026-10-07, 1 hint, 1 under community par, 193,448 solvers, 49s); FoxiMax 3; Polygonle 2; Krillion 2. At the time of Block 1 testing the latter three were research-only; **they were subsequently promoted to mandatory first-release/pilot catalogue targets on 2026-10-10**. That decision does not retroactively alter test outcomes. Samples are copied from the user's WhatsApp excerpts; not verified by logging into games. Additional formats required in Block 2.

**Step 2 — parser contract:** `puzzle_league_phase1_block1/CONTRACT.md` defines versioned status and typed field conventions. Raw share is preserved; WhatsApp metadata is separate; dates must not be inferred from chat timestamps. Wordle puzzle date unresolved, numeric ID captured. Minute Cryptic date captured, and community-par semantics unresolved. `recognized_valid` means syntax validated, **not** submission accepted or scored.

**Step 3 — local prototype:** `puzzle_league_phase1_block1/parser.py` Python standard library; `samples.txt` raw user-provided fixtures; `test_parser.py` automated tests; `parsed_output.json` captured result; `tests.txt` terminal test log. Run from extracted directory: `python -m unittest -v test_parser`, then `python parser.py < samples.txt > parsed_output.json`. The samples include personal names; anonymise before publishing or uploading to a public repository.

**Observed local results:** Python unittest: 11 tests, 11 PASS, 0 failures. Parsed transcript: 12 message records, `recognized_valid`: 2 Wordle + 1 Minute Cryptic; `needs_review` research games: 7; `unrecognized` chat: 2. Tests include malformed Wordle, Wordle X/6 synthetic failure, unsupported text, invalid Minute Cryptic and no-auto-scoring invariant. Synthetic cases are not asserted to be genuine game shares. All `scoring_eligible=false` deliberately. No score calculation, league allocation, server uniqueness, browser sharing or Android validation performed. No databases or migrations created.

**Problems and risks:** Only one Minute Cryptic real sample; further actual win/loss/par/hints variations needed. Wordle X/6 real fixture missing. Minute Cryptic hint taxonomy and community-par computation cannot be inferred confidently. Source game dates/IDs and chronological numbering have not been independently checked. No protection against edited share text; cannot establish player identity from sender. Separate WhatsApp-line parser is a convenience only and may need robustness for multi-line/copied exports. FoxiMax/Polygonle/Krillion formats are catalogued, not parsed or scored. User's source includes private sender names.

**Decisions at Block 1 completion:** No change to approved scoring, seasons or league model. The three additional games were catalogued as candidates **at the time of these tests**, then explicitly promoted to first-release targets in the subsequent scope amendment (§15). Existing 48-hour submission, approval, uniqueness and league scoring rules retained. Parser version `0.1.0-poc`, not a production API contract.

**Next chat handover (UPDATED by §15):** Phase 1 / Block 2 / Steps 4–6 ONLY: (4) expand fixtures/parsers for **all five games**, including real variations and safe review paths; (5) implement tested versioned Wordle and provisional Minute Cryptic scoring, and document **proposed/unapproved** scoring for FoxiMax, Polygonle, Krillion; (6) test puzzle identity, duplicate policy and ambiguous formats across observed examples. Upload this guide and the same accompanying ZIP containing the runnable Block 1 prototype. If additional work is needed beyond three steps, document a proposed extra Phase 1 block, not a silent change to the phase schedule. Do NOT begin Phase 2 or any database/PWA infrastructure.


---

# 15. REQUIREMENTS SCOPE AMENDMENT — FIVE-GAME FIRST RELEASE (2026-10-10)

**Authority:** User explicit instruction to add FoxiMax, Polygonle and Krillion to *this version* to facilitate a more representative live test with the planned group. **Status:** DECIDED for product/pilot scope; NOT IMPLEMENTED for those three game parsers/scorers.

**Approved five-game catalogue:** Wordle; Minute Cryptic; FoxiMax; Polygonle; Krillion. Existing membership, season, participation, moderation, uniqueness, league game selection and scoring-version controls still apply. The pilot may use a subset only if the owner selects one; the release should support all five as eligible choices.

**Evidence retained:** Original Block 1 parser and fixtures remain unmodified. User-provided share excerpts: Wordle (2), Minute Cryptic (1), FoxiMax (3), Polygonle (2), Krillion (2). Wordle/Minute Cryptic parsing succeeded locally in original tests; the three promoted games are currently `needs_review` detections, not validated/scored results. Local baseline rerun in this scope-amendment chat: `python -m unittest -v test_parser` from `puzzle_league_phase1_block1` yielded **11 tests, 11 PASS**. This is a regression check, **not** a test of new-game parsing. No database/schema migration, scoring code, or Android work performed.

**Required follow-up and acceptance for three promoted games:**

1. Capture a stable game identifier and validated puzzle identity; identify each game's explicit performance/completion fields and parse actual emojis, Unicode variants and trailer lines. Keep unconfirmed identity cases pending review.
2. Agree a game-specific, versioned scoring contract for each, consistent with league-wide participation (+1 accepted completed attempt), separate streak statistics, and no points for skipped submissions. Do not use their numerical outputs as league points until semantics and normalisation are approved.
3. Add positive/negative automated fixtures, malformed share handling, ambiguous/historic cases and reproducible scoring tests; later verify ingestion, league allocation and Android share target in their assigned phases before the pilot.

**Issues remaining:** Exact scoring choices for FoxiMax, Polygonle and Krillion UNKNOWN; authenticity and current share-format stability unverified; broader samples needed; Phase 1 may require an explicitly approved extension if Block 2 cannot produce responsible five-game coverage.

**Archived v1.3 handover prompt (SUPERSEDED by section 16):**

> Continue Puzzle League from `Puzzle_League_Project_Guide_PHASE1_BLOCK1_COMPLETE_FIVE_GAME_SCOPE_PHASE1_BLOCK2_START_2026-10-10.md` (authoritative, v1.3) and accompanying `Puzzle_League_Phase1_Block1_Prototype_2026-10-10.zip`. Phase 0 COMPLETE. Phase 1 Block 1 COMPLETE, 11 tests PASS for original Wordle/Minute Cryptic POC. The user has **approved five initial-release games: Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion**; only the first two have functioning POC parser coverage. Work strictly on Phase 1 Block 2 Steps 4–6. Extend fixtures and safe structured parsers across five formats, implement verified Wordle and provisional Minute Cryptic scoring, identify and propose (but do not silently approve) the other three scoring methods, and exercise puzzle identity/duplicate/review rules. Preserve the original requirements and audit evidence. Do not enter Phase 2, backend, database or PWA work. Finish with real tests and an updated checkpoint; flag the need for a third Phase 1 block if warranted.


---

# 16. CURRENT VERIFICATION — PHASE 1 BLOCK 2 / STEPS 4–6 (2026-10-10)

**Evidence checkpoint:** LOCAL POC TESTS PASS (26/26); **Phase 1 completion gate remains OPEN**. No database, hosting, Android PWA, authentication, league scoring, actual duplicate enforcement or pilot occurred. All 20 research records are `scoring_eligible=false`.

## Step 4 — fixture expansion and typed parsers

- New user-provided batch: eight WhatsApp messages from 6–7 September 2026: 6 Wordle, 1 Minute Cryptic, 1 Globle. Globle is OUT OF SCOPE and was left unrecognised; it did not enter the game catalogue.
- Two fixture files now contain 20 messages, of which 17 are approved-game results: Wordle 8, Minute Cryptic 2, FoxiMax 3, Polygonle 2, Krillion 2. Two previous chat-only records and the new Globle result are excluded. Sender names anonymised to `Player A/B/C` in the distributed fixtures; keep the original user-uploaded archive separately.
- Original parser v0.1.0 failed the new Minute Cryptic result because the result marker `🏋️` differed. Updated local parser `parser.py` v0.2.0-poc accepts both observed markers; new real example yields date `2026-09-06`, 6 hints, signed community-par difference **−3**, 180,458 solvers, time `34m 19s`. Original Oct 7 example still passes.
- Wordle #1905 and #1906 each have three different user-submitted results; all six September shares parsed structurally as valid. Black and white empty squares accepted, puzzle date not inferred from chat time.
- FoxiMax and Polygonle now extract typed reported values, validated sample row counts and relevant payload fields. Krillion captures reported integer and symbol trail as opaque until scoring semantics decided. All three remain `needs_review`, not authorised for scoring. Polygonle parser structurally supports 5–8 tiles/row, but only actual 8-position samples are verified; unsupported modes still need genuine examples.
- Source-game mechanics research (NOT user approval): FoxiMax is a hangman-style game in which misses add words and fewer words is better (https://foximax.com/about.html); Polygonle is six-guess with potentially differing word lengths and difficulty options (https://www.polygonle.com/tips); Krillion has 7 daily prompts, high scores from rarer valid answers, maximum 700 (https://krillion.io/). These sources support asking good scoring questions, not automatic activation.

## Step 5 — versioned pure score previews

- `scoring.py` implemented the approved Wordle 1–6 / X/6 table as `wordle-fixed-v1-approved`. Synthetic tests confirm totals `11, 9, 7, 5, 3, 2, 1`. All local outputs say `awarded=false`.
- Minute Cryptic `minute-cryptic-formula-v0-provisional` provides an auditable **unapproved for production** preview of the original formula: new Sep 6 result would yield performance 1 + participation 1 = **2**; original Oct 7 result would yield performance 10 + participation 1 = **11**. Par may partly derive from hints, so double-count risk remains. No league score allocated.
- `SCORING_PROPOSALS_NOT_APPROVED.md` documents three additional games' mechanical evidence and possible 0–10 performance rules. **NO scoring formula for FoxiMax, Polygonle or Krillion is approved or implemented.**

## Step 6 — identity, duplicate-policy demonstration and review gates

- `identity.py` creates stateless game/published-puzzle-ID candidates: numeric for Wordle/FoxiMax/Polygonle/Krillion, literal share date for Minute Cryptic. It shows intended uniqueness over `(authenticated_account_id, game, puzzle_identity)` but neither authenticates a WhatsApp sender nor stores/checks duplicates. Three different players on Wordle #1905 are NOT duplicates; repeat of same account and number would require server rejection.
- All five games' candidate IDs and malformed/unsupported/unknown formats have automated tests. Source puzzle date mappings remain unresolved for four number-based games; no 48-hour / timezone / league-membership eligibility test has occurred. Pending review and correction pathways remain later implementation steps.

## Test evidence and files

- Command from extracted package directory: `python -m unittest discover -v`
- **Actual result:** `Ran 26 tests ... OK`, zero failures; 11 original tests and 15 new. `parsed_output_block2_2026-10-10.json` contains 20 anonymised parsed message records.
- Package contents: `parser.py`, `scoring.py`, `identity.py`, `test_parser.py`, `test_phase1_block2.py`, `samples.txt` (anonymised original 12 messages), `new_samples_2026-09-06_to_07_anonymized.txt` (8 new messages), `CONTRACT.md`, `SCORING_PROPOSALS_NOT_APPROVED.md`, `parsed_output_block2_2026-10-10.json`, and `tests_block2_2026-10-10.txt`. No source repository or production service exists.

## Open owner decisions and later verification

1. Approve or revise FoxiMax scoring: how the numerator/fraction and letter count affect performance; whether `8/8` is successful; what a loss share looks like.
2. Approve Polygonle performance/failure table and approach to mode difficulty.
3. Approve Krillion direct 0–700 linear normalisation versus per-day competition ranking, plus decimal rounding and symbol-trail interpretation.
4. Reconsider Minute Cryptic formula after more examples because hints and par may not be independent.
5. Obtain real Wordle X/6 and edge samples, additional Minute Cryptic forms, non-eight-letter Polygonle, FoxiMax losses, Krillion varied score/symbol examples and game-number/date checks.

**Current scope decision:** Block 2 Steps 4–6 have a locally tested prototype implementation, but Phase 1 is **NOT PASS** because extended format and scoring acceptance gates remain open. Before altering the planned two-block Phase 1 structure, request explicit user approval for an extra short verification/decision block. Do not start Phase 2 until Phase 1 acceptance is properly resolved.


---

# 17. LATEST CHECKPOINT — WORDLEGROUP ARCHIVE, EXTENDED PHASE 1 VALIDATION (2026-10-10)

**Authority:** User supplied private `WordleGroup.zip` with `chat.txt` and `chat.md` representations of the **same** group. Scope remains Phase 1 Block 2 follow-on sample expansion and regression only. This section **supersedes the current-state figures** in §16 while preserving their historical evidence. NO new season/scoring rules were approved. Original ZIP was not placed inside published/repackaged code artifacts to avoid distributing group chat and participant information.

## A. Dataset reconciliation / Step 4

- `chat.txt` imported once, **432 WhatsApp message records**, of which **258** start with one of the five approved game result headers; **174** non-target/game chat/system messages excluded. `chat.md` is a second format of the same export, **not a second dataset**.
- New source result totals: **Wordle 116**, **Minute Cryptic 33**, **FoxiMax 70**, **Polygonle 18**, **Krillion 21**. Distinct extracted puzzle identities: respectively **45, 28, 40, 11, 13**; 137 distinct `(game, puzzle)` pairs altogether. Earlier small sample batches overlap this archive; **do not add earlier 17 result records to the archive's 258 as though all are unique new submissions**.
- Pseudonymised fixture records refer to `P01`–`P05`, not actual Puzzle League logins. Fields separate WhatsApp transport date from official puzzle date; game IDs copied from shares, not externally authenticated.
- Wordle: real `X/6` failure seen **4 times**; numeric attempts range **2–6**. **115/116** raw full messages were valid structured shares under the improved parser. One had additional chat commentary after a complete grid: typed result is `needs_review` on original raw text, and optional published fixture trims the **non-game** comment and records a redaction flag. No real `1/6` observed; synthetic 1/6 scoring test remains.
- FoxiMax: real `X/8` failure seen **4 times**; red tile 🟥 observed; all failures have 8 five-wide rows. Numeric `N/8` shares (including `1/8` and `8/8`) are separate from losses. `parser.py` updated to `0.3.0-poc`, typed `completed_failure` and nullable numerator; still review-only and no approved performance formula.
- Polygonle: **13 eight-cell** and **5 seven-cell** shares; one `😔/6` loss. Earlier requirement to obtain non-8-cell evidence is partially resolved; other puzzle lengths not independently verified.
- Minute Cryptic: 33 dated shares, **0–12 hints**, signed under-par difference **−8..+2**; all parsed on observed format. Community-par interpretation remains unverified, and planned formula remains *provisional*.
- Krillion: 21 shares, displayed numeric values **60–440**. No independent proof of symbol trail meaning or fair league-scoring conversion. All 109 additional-game results remain `needs_review` (FoxiMax 70, Polygonle 18, Krillion 21).

## B. Parser/scoring/identity / Steps 5–6

- Wordle approved fixed scoring stays unchanged, with 4 actual failure examples now exercising `X/6`. Minute Cryptic remains provisional; new game scoring remains NOT APPROVED / NOT IMPLEMENTED. No points awarded to participants or leagues.
- Imported archive yielded **0 repeated pairs of (WhatsApp transport sender, game, puzzle identity)**. This is *not* proof of uniqueness in a future authenticated app, does not merge multiple genuine player results for the same puzzle, and is not a backend/database test.
- One source message's non-game commentary was omitted from **published anonymized fixtures**; the user-provided original ZIP remains unchanged. Importer preserves valid grids/clues in the derivative fixture and marks this sanitation, so no publication of personal chat messages or group names is needed.
- A new archive-specific importer supports the export's **US-style timestamp format**, separate from the standalone POC's prior `[HH:MM, DD/MM/YYYY]` convenience transcript parser. It is a fixture-ingestion utility, not the eventual Android/WhatsApp integration interface.

## C. Tests and implementation evidence

- Current working package: `puzzle_league_phase1_wordlegroup_expansion/` with v0.3.0 parser, prior v0.2 baseline tests, new `import_wordlegroup.py`, anonymized `wordlegroup_five_game_anonymized.jsonl`, aggregate `wordlegroup_ingestion_report.json`, and `test_wordlegroup_corpus.py`.
- Command from package root: `python -m unittest discover -v`.
- **Actual result: `Ran 37 tests ... OK` — 37 PASS, 0 failures.** 26 earlier regressions retained; **11** new corpus assertions cover game counts, real Wordle/FoxiMax/Polygonle losses, red tiles, 7/8-cell Polygonle, Minute Cryptic hints, identity candidate counts, malformed input, privacy and extra trailing commentary.
- Import reproduction from private archive (only if the user has it locally): `python import_wordlegroup.py /path/to/WordleGroup.zip` — produces self-contained anonymized fixtures and aggregated counts. Running the 37 regression tests on the downloaded artifact **does not require the private ZIP**.
- Privacy packaging check: direct chat archive omitted and personal names removed from copied legacy fixtures/parsed outputs. The original uploaded source is not an app database or verified account record.
- Backend, DB, account/unique constraints, season score allocation, Android Share, PWA, real-world time-zone/deadline rules, moderation authorisation, and live pilot: **NOT IMPLEMENTED/NOT TESTED**.

## D. Decisions and outstanding phase gate

**Retained decisions:** Five game catalogue; Wordle fixed point table; +1 participation when eligible; no points for skipped; separate streak; deduplicate by authenticated account/game/puzzle in later backend; 48-hour late period; uncertain content to moderation. **No scoring-policy decision was changed in this chat.**

**Newly resolved evidence gaps:** Actual Wordle X/6; actual FoxiMax X/8/red tile; actual Polygonle 😔/6 and seven-cell grids; multiple Minute Cryptic hint/par conditions. These are *format observations*, not official authenticity proof.

**Still open:** (1) FoxiMax 1–8 successful performance table and X/8 loss handling policy (letter count influence?); (2) Polygonle guess-based performance and word-length/mode fairness; (3) Krillion high-score conversion versus ranked performance; (4) Minute Cryptic par/hint double-count concern; (5) official puzzle-number/date and timezone verification, unsupported formats and Android share tests in their proper phases.

**Phase 1 gate:** **OPEN / NOT PASS.** Explicitly propose (do not silently schedule) one short **Phase 1 Block 3** with: Step 7 — approve outstanding four game-specific scoring decisions; Step 8 — version and test approved formulas if decisions are received; Step 9 — formal parser/identity acceptance and next-phase handover. User approval is required to amend the originally planned two-chat Phase 1 schedule. If approval or evidence is missing, document `UNKNOWN` rather than claim live-pilot readiness.

## E. Next-chat starter (only after deciding whether to authorise a Block 3)

> Continue Puzzle League from `Puzzle_League_Project_Guide_v1.5_PHASE1_EXPANDED_CORPUS_TESTED_SCORING_DECISIONS_NEXT_2026-10-10.md` and the `Puzzle_League_Phase1_WordleGroup_Expanded_Prototype_2026-10-10.zip`. Phase 0 COMPLETE; Phase 1 Blocks 1–2 have 37 local tests PASS across 258 approved-game results imported from 432 WhatsApp messages. All five game formats are structurally parsed, but only Wordle has an approved fixed score table; Minute Cryptic is provisional and FoxiMax/Polygonle/Krillion review-only. Confirm whether to extend Phase 1 with a small third scoring-decision/verification block; if approved, work strictly on its Steps 7–9. Keep share samples pseudonymous, do not import other games, and do not start backend/database/PWA work until Phase 1 acceptance is resolved.


---

# 18. LATEST CHECKPOINT — PHASE 1 BLOCK 3 / STEPS 7–9 (2026-10-10)

**Status:** HISTORICAL PRE-APPROVAL SNAPSHOT, superseded by §19. **Authorisation:** User said “okay lets proceed” after recommendation for an additional short Phase 1 block; this authorises Block 3 research/decision workflow, **NOT any particular scoring method**. Blocks 1–2 and their historical evidence remain intact.

**Step 7 — scoring decision pack prepared / OWNER DECISIONS PENDING:** Cross-referenced 258 pseudonymised observed results with official descriptions at https://foximax.com/about.html, https://www.polygonle.com/tips, https://krillion.io/ and https://krillion.io/faq. Confirmed Minute Cryptic par-difference is derivable from hints and per-day par in same-puzzle shared results, so the old provisional `10−hints+signed_under_par` risks double-counting. Recommended: (1) Minute Cryptic performance `clamp(10−hints,0,10)`, par informational; (2) original FoxiMax daily /8 success performance `{1:10,2:9,3:7,4:6,5:5,6:4,7:2,8:1}`, X/8→0; (3) Polygonle daily standard 6–8-letter puzzles use Wordle performance table and 😔/6→0, no mode/length bonus; (4) Krillion daily 0–700 reported score maps to `min(10, floor((score+35)/70))`, one point rounding half-up, rather than league-rank normalisation; (5) explicitly accept sample-average point imbalances for pilot. **ALL FIVE PENDING APPROVAL**. See `SCORING_DECISION_PACK_UNAPPROVED.md`.

**Step 8 — separated candidate previews and tests, NOT approved implementation:** Copied the verified v0.3 prototype into `puzzle_league_phase1_block3_scoring_review/`; left `scoring.py` unchanged. Created `scoring_candidates.py` with clearly unapproved functions returning `awarded=false`, `approved=false`, and `candidate_only=true`. No authenticated user/season eligibility, no database writes, no scoring release changes. Added `test_scoring_candidates.py` (15 new tests), preserved the previous 37; ran `python -m unittest discover -v`, **52 tests PASS, 0 failures** on 2026-10-10. Expanded fixtures were reused unchanged. `candidate_corpus_what_if_summary.json` reports sample distributions, not awards.

**Step 9 — gate PENDING:** Rule approvals absent and therefore four production scoring policies cannot be marked complete. Puzzle/date mapping for Wordle, FoxiMax, Polygonle and Krillion is still not independently verified. Polygonle shares cannot reliably prove daily vs unlimited nor reveal difficulty modes; FoxiMax has training and six-/seven-letter variants; Krillion has other modes. Timezone/48h policy, server authentication/duplicate uniqueness and Android share targets belong to future implementation and remain NOT IMPLEMENTED. Recommend preserving safe review handling. Do not claim Phase 1 PASS until authorised requirements and verification are reconciled.

**What-if sample means (+1 participation if accepted):** Wordle 3.92 (116 shares); Minute Cryptic 7.85 (33); FoxiMax 4.44 (70); Polygonle 6.78 (18); Krillion 3.76 (21). These are nonrepresentative sample means and only proposed scores.

**Files:** `Puzzle_League_Phase1_Block3_Scoring_Review_Candidates_2026-10-10.zip` (privacy-safe prototype+tests), `SCORING_DECISION_PACK_UNAPPROVED.md` (inside ZIP), this updated authoritative guide v1.6.

**Next action:** User explicitly approves or revises the five detailed scoring recommendations. After acceptance, implement only the approved rule versions, rerun regression and boundary tests, assess remaining parser/puzzle-identity gap disposition, and update the final Phase 1 gate. **Do not start Phase 2 yet.**


---

# 19. LATEST VERIFIED CHECKPOINT — PHASE 1 BLOCK 3 COMPLETE / LOCAL POC PASS (2026-10-10)

**Status: PHASE 1 COMPLETE / PASS at bounded research-and-local-POC scope only.** Three Phase 1 blocks (Steps 1–9) were executed, with extra Block 3 explicitly authorised. All five game-specific score rules have now been explicitly approved by the user; the observed cross-game point distribution differences are accepted for the initial pilot. **The live app and server remain NOT STARTED.**

## Step 7 — Owner scoring decisions: COMPLETE / DECIDED

On 2026-10-10 the user replied **“agreed with all”** to the five specific recommendations in the decision pack. These replace prior unapproved/provisional proposals; there is no retroactive real league rescoring because no league results have been awarded. All **approved performance** outputs are 0–10, +1 only for a future accepted completed result. Wordle unchanged. Minute Cryptic now uses `max(0,10−hints)`; community par informational. FoxiMax original daily /8 uses `{1:10,2:9,3:7,4:6,5:5,6:4,7:2,8:1}`, X/8→0. Polygonle standard daily 6–8-letter puzzles use Wordle's table and 😔/6→0. Krillion daily reported integer score 0–700 uses `(score+35)//70` capped at 10. Differences in typical sample point averages are accepted for the first pilot (monitor, do not reweight midseason). See `SCORING_RULES_APPROVED.md` and `approved_scoring_rules_v1.json` in the companion ZIP.

## Step 8 — Approved rule preview implementation: COMPLETE / VERIFIED LOCAL

- `scoring.py`: five approved rule-version constants/functions and unified `preview_score`; `rule_approved=true`, `awarded=false`, `result_accepted=false`, eligibility/authentication required.
- `parser.py` bumped to **v0.4.0-poc**; old `scoring_not_approved` parser issues updated without making date/mode assumptions; all local POC results still `scoring_eligible=false`.
- `scoring_v0_historical.py` preserves old Minute Cryptic provisional formula. `scoring_candidates.py` is archived non-activated comparison code; historical proposal files explicitly marked superseded.
- `test_phase1_block2.py` revised only for the newly-approved hints-only expectations and Krillion known numerical scoring semantics. New `test_scoring_approved.py` covers five-game corpus, permitted ranges, boundaries, non-integer rejection, failure points, malformed shares, review gating and no-award protections.
- 258 pseudonymised five-game fixture results passed approved score **preview** checks. Aggregates `approved_scoring_corpus_preview.json`: 116 Wordle, 33 Minute Cryptic, 70 FoxiMax, 18 Polygonle, 21 Krillion. Totals are preview-only statistics, not standings.

## Step 9 — Gate and regression: COMPLETE / PASS for LOCAL POC, not pilot

**Verification command:** from extracted `puzzle_league_phase1_block3_APPROVED` directory:

`python -m unittest discover -v`

**Observed:** **76 tests run, 76 PASS, 0 FAIL, 0 errors**, 2026-10-10. Test log: `tests_phase1_block3_approved_2026-10-10.txt`. 52 previous baseline/candidate tests (historical candidate comparisons remain inert) + 24 new owner-approved scoring tests. No database tables, authenticated scoring, network services, UI or Android testing were created or asserted. No scored entry or season snapshot exists.

**Disposition of unverified identity/mode:** number-only puzzle keys are candidate unique identifiers, NOT verified calendar dates; WhatsApp sender/date is never accepted as authenticated app account or puzzle day. FoxiMax, Polygonle and Krillion stay `needs_review` with no automatic award. Unknown/miniformat/non-daily and malformed text stays invalid/ambiguous/review. These issues are explicitly handed to Phases 3–8, with pilot acceptance blocked until resolved. This separation satisfies Phase 1's *local POC* exit criteria but does not waive original live-pilot protections.

**Files distributed:** `Puzzle_League_Phase1_Block3_APPROVED_LocalPOC_2026-10-10.zip`, and this authoritative guide `Puzzle_League_Project_Guide_v1.7_PHASE1_LOCAL_POC_PASS_PHASE2_BLOCK1_NEXT_2026-10-10.md`. Raw original private group conversation is excluded from the prototype; fixture pseudonyms are not user accounts.

**NEXT — Phase 2 / Block 1 / Steps 1–3 ONLY (new chat):**
1. Examine real developer environment and current platform compatibility/cost requirements. Select frontend, backend, persistence and hosting architecture (only then declare stack DECIDED).
2. Establish the actual local repository/project structure with concrete tools/versions based on the user's environment. Confirm start, test and lint commands; no premature assumptions of installation.
3. Set up initial TypeScript/tooling/testing standards and validate a reproducible clean local start, preserving Phase 1 Python research prototype as evidence until the parser port/integration phase is planned.

**Starter prompt:**

> Continue Puzzle League from the authoritative `Puzzle_League_Project_Guide_v1.7_PHASE1_LOCAL_POC_PASS_PHASE2_BLOCK1_NEXT_2026-10-10.md` and the matching `Puzzle_League_Phase1_Block3_APPROVED_LocalPOC_2026-10-10.zip`. Phase 0 requirements COMPLETE. Phase 1 parser/scoring local POC COMPLETE/PASS, 76 tests and 258 pseudonymised shares across five games; owner approved all five scoring/fairness decisions. All scores are previews, no backend, database, accounts, frontend, Android share integration or real league awards exist. Start **Phase 2 Block 1 Steps 1–3 ONLY**: inspect my actual development environment, confirm architecture/tool versions and compatibility/costs, establish the local repository and reproducible frontend tooling/test baseline. Keep the Phase 1 verified parser files and approved scoring contracts intact. Do not silently start later phases. Finish with a verified updated Markdown checkpoint.


---

# 20. HISTORICAL CHECKPOINT — PHASE 2 BLOCK 1 / STEPS 1–3 PREPARED (2026-10-10; SUPERSEDED BY §21)

**Historical snapshot (no longer the active project status):** At this earlier point, the local foundation was packaged but user-side checks had not yet run. Phase 2 Block 1 was subsequently verified and passed as recorded in §21. The user uploaded the authoritative v1.7 guide and Phase 1 Block 3 approved POC ZIP to begin the next project stage. This is a continuation in the bounded Phase 2 Block 1 scope, not authorisation to start Phase 3.

## Step 1 — Environment and architecture choice (PROPOSED; OWNER DECISION / USER DEVICE PENDING)

- The actual user's Windows development system could not be inspected remotely. A **separate sandbox environment** was inspected: Linux, Node.js 22.16.0, npm 10.9.2, Git 2.47.3, Python 3.13.5. These values MUST NOT be represented as observed on the user's machine.
- Public product docs checked on 2026-10-10 support **React 19 + TypeScript + Vite 8**, with Node.js **24 LTS** recommended (Vite 8 supports Node 22.12+). Current Vitest requires Node 22.12+ with compatible Vite. The starter declares Node >=22.12 for compatibility, and `.nvmrc` targets 24 for new installations.
- **RECOMMENDED (not yet DECIDED by owner):** frontend React/TypeScript/Vite; backend Supabase Auth + PostgreSQL + enforced Row Level Security and trusted server-side functions; Cloudflare Pages static deployment; Git/private GitHub; Vitest tests + Oxlint + strict TypeScript. Only the local UI skeleton has been prepared; no external accounts or backends created.
- **Cost research, not acceptance:** Supabase Free includes two active projects, 500 MB DB each, possible auto-pause after 7 idle days and no automatic free-plan backups; Pro from about US$25/month. Cloudflare Pages Free offers 500 builds/month. GitHub Free allows private repositories. No spending or service setup was performed. Production reliability and actual billing remain later checks.
- References: https://vite.dev/blog/announcing-vite8 ; https://nodejs.org/en/about/previous-releases ; https://vitest.dev/guide/ ; https://supabase.com/pricing ; https://supabase.com/docs/guides/database/postgres/row-level-security ; https://developers.cloudflare.com/pages/platform/limits/ ; https://docs.github.com/en/get-started/learning-about-github/githubs-plans .

## Step 2 — Local repository and source structure (SANDBOX PREPARED; USER LOCAL INSTALL PENDING)

- Created distributable ZIP `Puzzle_League_Phase2_Block1_Foundation_PREPARED_2026-10-10.zip` with top-level `puzzle-league/` directory. Source root includes `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/`, `tests/`, `scripts/`, `docs/`, `.gitignore`, `.editorconfig`, `.nvmrc`, `.env.example`. A minimal placeholder page names five supported games but has no app actions.
- The complete **35-file** previous approved local POC is under `research/phase1-approved-local-poc/`, including parser.py/scoring.py/identity.py/approved scoring JSON, original tests and pseudonymised research corpus. All 35 source file SHA-256 hashes match the user's uploaded Phase 1 ZIP; `research/phase1-sha256-manifest.json` enables repeat checks. No Python parser/scoring source was modified. Raw private WordleGroup chat was not included.
- Git repository initialisation in this sandbox can be verified, but no user's local Git project or remote Github repo exists or was accessed. Reproducibility across developer machines requires user `npm install` to create a lockfile, followed by `npm ci` for later clean installs.

## Step 3 — Tooling/tests/clean local run (PARTIAL VERIFIED / REST OPEN)

- The skeleton declares React, Vite, TypeScript, Vitest, Oxlint and scripts: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check`; also self-contained `node --test tests/foundation.test.mjs`. There are three *declared* Vitest catalogue tests; none have yet executed because packages could not be installed in this environment.
- **VERIFIED here:** `python -m unittest discover -q` from the original Phase 1 extracted research artifact: **76 tests PASS**; no errors. `node --test tests/foundation.test.mjs` from the new starter: **4/4 PASS** after excluding transient Python cache files. SHA-256 equality test verifies all 35 original ZIP files unchanged.
- **BLOCKED / NOT TESTED:** The sandbox `npm view vite version` failed with `EAI_AGAIN` (npm registry DNS/network unavailable); therefore `npm install`, real Vite development server, TypeScript compilation, Oxlint, Vitest, production build, browser launch and real Windows execution are **NOT VERIFIED**. Do not mark Block 1 PASS based on scaffold/file-presence tests alone.
- No database migrations, authentication users, real submissions, scored league points, season state, hosted service, installed PWA, Android Share Target, or integration tests were created. Original Phase 1 mode/date verification gaps remain open.

## Block 1 completion requirements still OPEN

1. Inspect actual developer-PC versions of Node/npm/Git and confirm editor / OS constraints.
2. Owner accepts or revises architecture (the named vendors remain RECOMMENDED, not DECIDED).
3. From the extracted project root, user completes `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run dev`, confirms the browser page, and preserves generated `package-lock.json`. Record real outputs and version numbers.
4. Validate local Git initialization and repository working tree on user machine; no remote is required to validate Block 1.

**Latest files:** `Puzzle_League_Phase2_Block1_Foundation_PREPARED_2026-10-10.zip` and `Puzzle_League_Project_Guide_v1.8_PHASE2_BLOCK1_PREPARED_LOCAL_VERIFICATION_NEXT_2026-10-10.md`. The ZIP includes `docs/WINDOWS_QUICKSTART.md` and a copy of this v1.8 guide.

**Next action in same chat / same Block 1:** Run the commands in `docs/WINDOWS_QUICKSTART.md` on the Windows development PC, paste the outputs, approve/revise the stack, and resolve any failures. **Do not start Phase 2 Block 2 until Block 1 exit is truly verified.**

**Next-chat starter (only after Block 1 verification):**

> Continue Puzzle League from the most recent updated checkpoint after Phase 2 Block 1. Phase 0 complete; Phase 1 local POC passed 76 Python tests; approved Python parser/scoring research preserved verbatim. Only begin Phase 2 Block 2 Steps 4–6 after Windows npm install/typecheck/lint/Vitest/build/browser start are evidenced and the architecture is explicitly decided. Establish package/module boundaries, config/secrets rules and CI/developer standards without starting database/authentication/PWA work prematurely.


---

# 21. PRIOR VERIFIED CHECKPOINT — PHASE 2 BLOCK 1 COMPLETE / PASS; BLOCK 2 HANDOVER (2026-10-10)

**Status:** **Phase 2 Block 1 / Steps 1–3 COMPLETE / PASS** based on the actual terminal outputs and local browser screenshot supplied by the user on 2026-10-10. **Overall Phase 2 is NOT COMPLETE**: Block 2 Steps 4–6 are next. The approved stack is a decision, not a deployed backend or production app.

## Step 1 — Developer environment and architecture (COMPLETE / VERIFIED + DECIDED)

- **Actual Windows developer PC tool versions, from user terminal:** `node --version` → `v24.20.0`; `npm.cmd --version` → `11.19.0`; `git --version` → `git version 2.55.0.windows.5`; `py --version` → `Python 3.14.6`. `winget --version` → `v1.29.380`. Node.js and Git installers verified present under `C:\Program Files\nodejs\node.exe` and `C:\Program Files\Git\cmd\git.exe`; their PATH initially needed refreshing. Windows is confirmed via PowerShell logs; edition/build not independently checked.
- **Official owner approval on 2026-10-10:** React + TypeScript + Vite, Supabase Auth/PostgreSQL/RLS/trusted server functions, Cloudflare Pages hosting, local Git and planned private GitHub, Android-first installable PWA with paste fallback. This replaces §20's `PROPOSED` label. No cloud or remote account was created.
- Source/browser testing verifies a locally served *placeholder* showing the five planned game names only. UI operation is **NOT** evidence of submissions, authentication, league logic or Android sharing.

## Step 2 — Local repository and dependency foundation (COMPLETE / VERIFIED)

- Working directory shown in the supplied log: `C:\Users\USER\Desktop\Development\Puzzle_League\Puzzle_League_Phase2_Block1_Foundation_PREPARED_2026-10-10\puzzle-league`. This is the user's actual local source root for the next chat, unless relocated.
- `npm.cmd install` → **47 packages added; 48 audited; 0 vulnerabilities reported** in that run; generated `package-lock.json`. `npm` major-version upgrade notice was informational and **not** acted upon.
- `git init -b main` succeeded. Files staged and reviewed; `.gitignore` extended for Python cache files. `.gitattributes` added for LF text normalization and Markdown trailing-space exception. `git diff --cached --check` ended with **no output** (PASS). Earlier LF→CRLF warnings were nonfatal.
- First committed revision: `[main (root-commit) 3f87610] chore: establish Puzzle League Phase 2 foundation`; **59 files changed, 7065 insertions**. `git status --short --branch` → `## main` (clean); `git log -1 --oneline` → `3f87610 (HEAD -> main) chore: establish Puzzle League Phase 2 foundation`.
- The private original WordleGroup chat is not included in the distributed research bundle. Phase 1 approved parser/scoring research is under `research/phase1-approved-local-poc/`, with a 35-file SHA-256 preservation manifest. No GitHub remote or cloud sync is verified. Do not confuse this user's **real local Git commit** with the earlier sandbox Git init described historically in §20.

## Step 3 — TypeScript/testing standards and local start (COMPLETE / VERIFIED)

| User-run verification | Observed actual result | Disposition |
|---|---|---|
| `npm.cmd run check` initial attempt | `src/catalog.test.ts` TypeScript error TS2591 importing `node:fs` | **Initial FAIL / FIXED**, not concealed |
| Remediation | Added `"node"` to `compilerOptions.types` in `tsconfig.app.json`, retaining `"vite/client"` | **APPLIED** on user PC |
| `npm.cmd run check` rerun | `tsc -b` passed; `oxlint src` 0 warnings/0 errors; Vitest v5.0.3 **3/3 PASS**; Vite v8.3.4 **production build PASS**, 17 modules transformed | **PASS** |
| `npm.cmd run dev` + browser | User screenshot shows placeholder Puzzle League app rendering five supported-game names in browser | **PASS — browser start only** |
| `npm.cmd run verify:offline` | Node foundation suite **4/4 PASS** (private package, required skeleton/contract, all Phase 1 file hashes unchanged, example credentials check) | **PASS** |
| `git diff --cached --check` | No output after `.gitattributes` exception | **PASS** |
| Git root commit and status | Commit `3f87610`, branch `main`, clean status | **PASS** |

- Previous isolated Python Phase 1 tests: **76/76 PASS** in the earlier supplied prototype evaluation; these **were not freshly rerun on the user's Windows PC** in this Block 1. Current user's offline integrity test **4/4 PASS**, including exact 35-file match. Preserve this distinction.
- Verified local quality commands: `npm.cmd run check` (typecheck → lint → Vitest → build), `npm.cmd run verify:offline`, `npm.cmd run dev`. `npm.cmd` is preferred in PowerShell to avoid `.ps1` execution-policy issues. `npm.cmd ci` may be used for a clean dependency installation now that lockfile exists; not yet re-tested on another machine.
- Actual test coverage remains *starter-only* (three catalogue-contract tests and four foundation checks); there is no integrated TypeScript parser/scorer, database, auth, submission processing, league scoring, moderation or PWA service worker.

## Block 1 exit gates — CLOSED / VERIFIED

1. **Selected technology architecture:** user explicitly approved — **PASS / DECIDED**.
2. **Real development environment:** Windows tool versions supplied and verified — **PASS**.
3. **Reproducible source and tooling:** installation, strict TS, Oxlint, Vitest, production build and browser startup demonstrated — **PASS for single developer machine**, cross-machine clean `npm ci` not yet tested.
4. **Research preservation:** 35 approved Phase 1 source files unchanged by offline hash checks; no scoring awarded — **PASS**.
5. **Version-control anchor:** local Git `main` root commit `3f87610`, clean tree — **PASS**.

**Files actually changed on user's Windows machine relative to the *original packaged starter*:** generated `package-lock.json`; `tsconfig.app.json` enables Node types; `.gitignore` includes Python caches; new `.gitattributes` for LF and Markdown rules; local Git history created. These changes were verified through command outputs, **not reconstructed as a complete new source ZIP in this conversation**. The ZIP distributed in §20 is an *earlier starter snapshot* and MUST NOT be treated as identical to the user's committed `3f87610` repository.

**Database/schema/migrations changed:** NONE. **Live submissions/accepted results/awards:** NONE. **Supabase/Cloudflare/GitHub accounts:** NOT CREATED or NOT VERIFIED. **Device Share Target:** NOT TESTED. **Pilot:** NOT STARTED.

## Next chat — Phase 2 Block 2 / Steps 4–6 ONLY (bounded scope)

**Step 4 — Module/package boundaries.** Inspect the actual committed file tree, `package.json`, `vite.config.ts`, `src/`, `research/` and tests *before* editing. Choose minimal module boundaries (e.g., domain catalog, game-specific parser contract, scoring contract, UI, future infrastructure adapters), without porting the Python parser or implementing API/database/league scoring in this block. Keep approved five-game scoring IDs and all Phase 1 evidence intact. Avoid unnecessary monorepo complexity.

**Step 5 — Configuration and secrets conventions.** Define explicit local/test/production environment variables and validation/documentation, including how a **future** Supabase public anon/publishable key differs from secret service-role/admin keys. Keep all server-only credentials out of browser-exposed `VITE_` variables, source control and production bundles. Use safe `.env.example` placeholders, `.gitignore` policies and documentation. Do not create production credentials or a live Supabase project in this Phase 2 block.

**Step 6 — Quality/CI and contributor reproducibility.** Establish an auditable repeatable verification command and appropriate GitHub Actions configuration **as committed files** (a remote GitHub-run CI execution is NOT VERIFIED until actually run); refine Windows quickstart/readme, check safe lockfile/CLI use, and run real TypeScript/lint/Vitest/build/offline integrity checks on the Windows PC. Make a clean reviewable Git commit and capture its hash/status. Do not begin Phase 3 or Android PWA functionality.

**Block 2 acceptance:** Boundary/config docs and files are precise; no copied Phase 1 file changes; no committed secrets; automated checks pass on the actual Windows PC; reproducible instructions and staged/committed changes are recorded. For cloud CI, distinguish a validated YAML/workflow file from an actually executed remote run. After Block 2, update v2.0 checkpoint and assess Phase 2 overall exit; do not call a phase PASS without exit criteria.

### Source-transfer requirement for the new chat

This `v1.9` guide is authoritative for **decisions and verification**, but it is not a byte-for-byte copy of the user's current Git tree. Start Block 2 against the actual commit `3f87610`, not the earlier `PREPARED` starter ZIP. The user may generate a privacy-reviewed portable archive from their local repository (inside `puzzle-league` directory) using:

```powershell
git archive --format=zip --output=..\Puzzle_League_Phase2_Block1_Commit_3f87610.zip HEAD
```

Upload the resulting ZIP **and this v1.9 guide** in the next chat. The archive omits `.git`, untracked files, `node_modules`, runtime secrets and the build output; it contains all tracked files at the commit. The archive should be checked for any undesired confidential information before uploading or distributing. `git archive` has not yet been run by the user, so this ZIP is **NOT VERIFIED / NOT CLAIMED TO EXIST**. This v1.9 `.md` was generated separately after commit `3f87610` and can be copied into `docs/` and committed as a later, separately tracked documentation update.

### COPY-PASTE STARTER PROMPT — NEW CHAT

> Continue **Puzzle League** from the attached authoritative `Puzzle_League_Project_Guide_v1.9_PHASE2_BLOCK1_COMPLETE_PHASE2_BLOCK2_NEXT_2026-10-10.md` and the current local Git source archive from commit `3f87610` (if provided). **Phase 0 COMPLETE; Phase 1 LOCAL POC COMPLETE/PASS** (76/76 Python tests, five approved games and scoring rules, 258 pseudonymised shares, zero real awards). **Phase 2 Block 1 / Steps 1–3 COMPLETE/PASS**, based on real Windows npm installation, TypeScript/lint/3 Vitest tests/Vite build, browser startup, 4/4 research-preservation checks, and local clean Git root commit `3f87610` on `main` (59 files). The owner has **APPROVED** React + TypeScript + Vite; Supabase Auth/PostgreSQL/RLS/trusted server functions; Cloudflare Pages; Git/private GitHub; Android-first PWA with paste fallback. Those cloud/mobile features are **NOT DEPLOYED**. Start **Phase 2 Block 2 / Steps 4–6 ONLY**: inspect the real repository and organise module boundaries; formalise environment/secrets conventions; set up repeatable CI/static checks and developer instructions. Work in small verifiable steps with actual output, preserve original Phase 1 parser/scoring evidence verbatim and do not start database/authentication, scoring integration, season engine, PWA/Share Target or deployment. End by recording real tests/commits and preparing the next authoritative Markdown checkpoint.


---

# 22. HISTORICAL PREPARED CHECKPOINT — PHASE 2 BLOCK 2 BEFORE WINDOWS ACCEPTANCE (2026-10-11; SUPERSEDED BY §23)

**Historical evidence only:** This §22 records the **pre-acceptance prepared-source status** and is superseded by §23 for current status/next steps. It preserves §21's independently verified owner Windows baseline. The uploaded ZIP identifies archived Git commit `3f87610d3dc67baba3c841ecbf9fb83b25fa34bb` and contains the 59 tracked files described in §21. It was inspected before any modifications. The authoring environment is a **separate Linux sandbox**, not the owner's Windows PC; the distributed patch must be applied to the owner's actual repository. Only Phase 2 Block 2 Steps 4–6 are addressed. **No new owner-PC Git commit or GitHub Actions run has occurred in this chat.**

## Step 4 — Module boundaries (PREPARED; offline tested, not owner-Windows accepted)

- The committed `package.json`, `package-lock.json`, `vite.config.ts`, TypeScript config, `src/`, research baseline, offline checks, README and development docs were inspected. No monorepo or new production dependency was justified.
- The placeholder React screen and styles were relocated to `src/ui/`, and the five-game display-only catalogue/test to `src/domain/games/`. `src/main.tsx` imports the relocated UI. `src/domain/results/contracts.ts` records **type-only** research parser statuses, candidate identity and non-awarding references. `src/config/` hosts the public-only environment label; `src/infrastructure/` is an explicit **not-yet-implemented** boundary. See `docs/MODULE_BOUNDARIES.md`.
- The five game identifiers and exact owner-approved scoring rule IDs are preserved. The **35 Phase 1 Python research files remain byte-identical** to the original preservation manifest, including scoring, original fixture tests and 258 pseudonymised share corpus. Python is **not** ported to the frontend; no actual parsing/award logic is introduced.

## Step 5 — Environment, public configuration, and secrets (PREPARED; local policy checks PASS)

- `.env.example` contains a blank optional `VITE_APP_STAGE` and **commented future-only** public Supabase URL/publishable-key examples. `src/config/public-env.ts` validates the public `local`, `test`, `production` stage label and infers it from Vite mode if blank. `vite.config.ts` validates it at build time, refusing to label production builds as local/test.
- `docs/CONFIGURATION_AND_SECRETS.md` explicitly distinguishes **browser-exposed `VITE_` values** from forbidden server-only Supabase service-role/secret keys, database passwords, JWT signing secrets and administrative credentials. No Supabase project, API client, cloud token, real key or server is created. Access control is a **future backend** responsibility.
- `scripts/config-policy.mjs` and `scripts/verify-config.mjs` assert example allowlisting, Git-tracked `.env` exclusion when `.git` exists, and `.gitignore` safeguards. These checks are useful guardrails, **not a comprehensive secret scanner**.

## Step 6 — CI, repeatable local checks, Windows docs (PREPARED; execution pending)

- `.github/workflows/verify.yml` (new) uses `actions/checkout@v7`, `actions/setup-node@v7` with Node 24, and `actions/setup-python@v7` with Python 3.13, `npm ci`, then `npm run check`; GitHub token is read-only and no deployment/secrets are referenced. Configuration was checked against official GitHub action documentation and parsed locally. **REMOTE GITHUB ACTIONS STATUS: NOT RUN; no private GitHub repository created or connected.**
- `package.json` now specifies `verify:offline` = config guard + Node tests; `test:research` = preserved Python regression suite; `check` = offline verification → Python research → TypeScript → Oxlint → Vitest → Vite build. The lockfile and dependency selections were **not modified**. `README.md`, `docs/WINDOWS_QUICKSTART.md`, and `docs/CI_AND_TESTING.md` now explain the actual current architecture, commands, evidence limitations, safe patch application to the live Git repository and clean new commit sequence. The exact v1.9 guide is included at `docs/PROJECT_GUIDE_v1.9.md`; v1.8 remains historical.
- Distribution: `Puzzle_League_Phase2_Block2_Changes_from_3f87610.patch` **apply to existing Git repository** (do not replace its `.git`); optional fully prepared source reference ZIP `Puzzle_League_Phase2_Block2_Prepared_Source_2026-10-11.zip`; this detached current authoritative v2.0 Markdown guide.

## Actual verification evidence — 2026-10-11

| Execution context | Exact verification | Observed result | Status |
|---|---|---|---|
| Isolated Linux sandbox, Node v22.16.0 | `npm run verify:offline` | Config policy PASS; **8/8 Node tests PASS**, 0 failed; tests include 35 research SHA-256 comparisons and CI specification assertions | **PASS (sandbox)** |
| Isolated Linux sandbox, Python v3.13.5 | `npm run test:research` | **76 tests run / OK**, zero failures/errors | **PASS (sandbox)** |
| Isolated Linux sandbox | PyYAML BaseLoader parse `.github/workflows/verify.yml` | YAML parses; `main` push, PR, manual dispatch, `npm run check` found | **PASS (syntax only)** |
| Isolated Linux sandbox | `git diff --check` on prepared changes | No whitespace failures reported | **PASS (sandbox)** |
| Fresh extracted archive / patch replay | `git apply --check`, `git apply` from original `3f87610` ZIP, compare final working tree | **PASS; all 72 prepared tracked files byte-identical; 8/8 Node and 76/76 Python checks PASS again** | **PASS (sandbox patch verification)** |
| Isolated Linux sandbox | `npm ci --offline --no-audit --no-fund` | FAIL `ENOTCACHED` missing npm tarball; separate online attempt failed to fetch packages due DNS `EAI_AGAIN` and npm's `Exit handler never called` error | **BLOCKED (sandbox registry access)** |
| Owner Windows PC, **new changes** | `npm.cmd ci`, `npm.cmd run check`, `npm.cmd run dev`, `git diff --check`, Git commit/status | **NOT PROVIDED / NOT YET OBSERVED** | **PENDING / NOT TESTED** |
| GitHub remote | Workflow upload and actual Actions job run | No remote created; no Actions run result | **NOT RUN** |

**Important distinction:** The old Block 1 Windows check (3/3 Vitest, production build and browser) was genuinely PASS on 2026-10-10. Those results **do not automatically verify the new Block 2 files**. No frontend package installation, TypeScript/lint/Vitest or Vite build completion was achieved inside the authoring sandbox for these new files. Do not assert that all Phase 2 exit conditions passed.

## Acceptance and next action (SAME BLOCK ONLY)

1. From the owner's real, clean `main` repo at `3f87610`, run `git status --short --branch` and `git rev-parse --short HEAD`. **Do not reinitialise Git, reset history, or unzip a replacement over the live repository.** Review the patch; run `git apply --check` and then `git apply` for the supplied patch stored in the parent directory.
2. Run in order: `npm.cmd run verify:offline`, `npm.cmd run test:research`, `npm.cmd ci`, `npm.cmd run check`, `npm.cmd run dev` and check the actual placeholder in a browser. Record exact results; any error keeps Block 2 open. The existing Python research must still hash-match 35/35. Stop the Vite server with Ctrl+C.
3. Inspect `git diff --check`, `git status --short --branch` and the changed files for unwanted content. Only after all local checks PASS, stage and commit on the owner's PC. Record the actual **new commit SHA**, and verify a clean Git tree. GitHub remote run stays not verified unless separately observed. These actions remain within Step 6, **not Phase 3**.

**Phase 2 overall gate:** **OPEN** until Step 6 has evidence from the owner's Windows machine and the new clean commit. Do not mark the prepared code as owner-verified PASS. Once observed, publish the next **Phase 2 COMPLETE** authoritative guide (e.g. v2.1) with exact logs/hash. The *following separate chat* can be handed to Phase 3 / Block 1 / Steps 1–3 **only after** Phase 2 exit criteria pass and the updated checkpoint is issued. No Phase 3 work is authorized by this document.

**Reminder:** No production authentication, persistence, APIs, league results, season scoring, share target, PWA service worker, cloud deployment, or real player points have been created. The five-game parsing/scoring local POC stays research-only with mode/date verification gates unresolved.

## Windows continuation prompt (same Block 2, not Phase 3)

> Continue Puzzle League from the authoritative v2.0 §22 checkpoint and prepared Phase 2 Block 2 patch. The baseline is owner Windows Git commit `3f87610`; the patch reorganises UI/domain/config, establishes a public-only env/secrets policy and a GitHub Actions CI specification. Sandbox evidence: 8/8 Node offline PASS, 76/76 Python PASS, 35/35 research hashes, YAML syntax PASS. Windows tests of changed files, `npm.cmd ci`, full `npm.cmd run check`, dev browser and new Git commit are NOT yet verified, and remote GitHub Actions has NOT run. Work ONLY on accepting Phase 2 Block 2 Steps 4–6, verifying commands and recording the actual new commit. Do not begin Phase 3/database/authentication, Phase 4 scoring, or Phase 6 PWA/Share Target. Once Windows PASS is established, update the authoritative guide to v2.1 with verified results and conditional next-phase handover.


---

# 23. HISTORICAL CHECKPOINT — PHASE 2 COMPLETE / PASS; PHASE 3 BLOCK 1 HANDOVER (2026-10-11; SUPERSEDED BY §24)

**Historical authority (superseded by §24):** This §23 superseded §22's earlier **PREPARED / WINDOWS PENDING** status, while retaining all historical test records in §§19–22. **Phase 2 is COMPLETE / PASS at its defined local architecture/repository-foundation scope.** This document was produced **after** the owner's verified Git commit, and is delivered as a separate checkpoint; its presence inside the owner's local Git repository is **NOT VERIFIED**. No additional source changes or new app commit are claimed by issuing this Markdown file.

## Phase 2 Block 2 / Steps 4–6 — acceptance record

| Step | Completed scope | Evidence | Decision |
|---|---|---|---|
| **4** | Defined separation of UI (`src/ui/`), approved five-game catalogue (`src/domain/games/`), type-only result contracts (`src/domain/results/contracts.ts`), config (`src/config/`), and reserved `src/infrastructure/`; updated `src/main.tsx`/Vite wiring. No Phase 1 parser port. | On owner Windows: TypeScript, Vitest 9/9, build, browser startup confirmation; staged file review | **COMPLETE / PASS** |
| **5** | Formalised public-only `VITE_APP_STAGE` (`local`, `test`, `production`), `.env.example`, secrets guidance and local Git-environment policy; future-only Supabase publishable/URL examples, no keys. | Config guard PASS; 8/8 offline Node tests PASS including environment policy and preservation assertions | **COMPLETE / PASS** |
| **6** | GitHub Actions workflow specification, locked-install CI command, reproducible quality script, Windows/contributor onboarding, staged review and local commit. Corrected `verify:offline` to list only the two `.mjs` Node test files, keeping `.ts` tests in Vitest. | `npm.cmd ci` PASS; `npm.cmd run check` PASS; clean staged review and user Git commit `4f0220e`; browser confirmed | **COMPLETE / PASS for local CI foundation; remote GitHub run NOT TESTED** |

### Verified Windows evidence — owner-supplied terminal outputs, 11 October 2026

1. `npm.cmd ci`: **47 packages added; 48 audited; 0 reported vulnerabilities**, successful exit.
2. An initial `npm.cmd run check` **FAILED** because a bare `node --test` also discovered `.ts` Vitest files, causing `ERR_MODULE_NOT_FOUND` for extensionless imports; this is recorded, not hidden. The command was corrected with `npm.cmd pkg set 'scripts.verify:offline=node scripts/verify-config.mjs && node --test tests/foundation.test.mjs tests/config-policy.test.mjs'` and rerun.
3. Corrected `npm.cmd run verify:offline`: environment tracking policy PASS; **8 tests PASS**, zero failures, including SHA-256 preservation of the **35 original Phase 1 research files**.
4. Complete `npm.cmd run check`: **PASS** — `test:research` **76/76 PASS** (Python via `py`); `tsc -b` PASS; `oxlint src` 0 warnings / 0 errors across 10 files with 96 rules; `vitest run` **9/9 PASS** across 3 test files (Vitest **v5.0.3**); Vite **v8.3.4** production build PASS with **18 modules transformed**. Test total **8 + 76 + 9 = 93**, none failing.
5. Git pre-commit: `git diff --cached --check` **no output**; `git diff --cached --name-only -- research/` **no output**; staged diff **24 files, 1,302 insertions, 73 deletions**. Staged review showed no unexpected file or original Python research changes. Configuration safety checks are guards, **not** proof against every possible secret.
6. `git commit -m "chore: complete Phase 2 foundation tooling and CI"` returned `[main 4f0220e]` with **24 files changed**. `git log -1 --oneline` returned `4f0220e (HEAD -> main) chore: complete Phase 2 foundation tooling and CI`. `git status --short --branch` returned **`## main`** (clean). Commit `3f87610` remains the earlier Phase 2 Block 1 base.
7. The owner replied **“confirm”** to the explicit final request to verify that `npm.cmd run dev` displayed the reorganised placeholder in a local browser. **Browser confirmation: PASS on user report** (no new browser screenshot or separate console log was supplied in this step). This validates local browser display only, not interactive league features.
8. **GitHub-hosted Actions run: NOT TESTED.** The workflow file exists in the local commit, but no private GitHub remote, workflow run URL, or successful cloud job was observed. **No cloud/backend provisioning was performed.**

**Source/deliverable fidelity:** The prepared ZIP and patch from §22 reflect the **pre-Windows correction**; the actual Windows `4f0220e` includes the one-line corrected `verify:offline` script. Do **not** treat the older prepared-source ZIP as an exact archive of final commit `4f0220e`. The authoritative runnable code is the owner's **current local `main` at `4f0220e`**. Preserve that repository and its Git history. For a fresh-chat source transfer, create and privacy-check a `git archive` directly from the final commit; this guide alone is not executable source.

## Phase 2 overall exit — CLOSED / PASS

- [x] Owner-approved technology direction preserved and documented; no unapproved provider substitution.
- [x] Minimal module and package boundaries established without creating APIs, databases or a Python parser port.
- [x] Explicit public-environment/secrets handling guidance and repeatable local configuration checks.
- [x] Locked dependency install, Python research preservation and full Windows TypeScript/lint/test/build pipeline pass.
- [x] Local reorganised React/Vite browser startup confirmed by owner; placeholder only.
- [x] Local Git commit **`4f0220e`** on `main`, clean working tree, no tracked changes to original `research/`.
- [x] Developer documentation, CI configuration and project handover provided.
- [ ] Remote GitHub Actions execution — **DEFERRED / NOT VERIFIED**, not a prerequisite of this locally scoped Phase 2 gate. Must be tested when GitHub remote is established.

**Boundary:** Phase 2 passing does **not** imply a functional league app. No authentication, Supabase database, RLS, Edge Functions, real submissions, league membership, season engine, accepted scores, deployed site, PWA manifest/service worker, Android Share Target, real scoring or real player accounts exist in the verified app foundation. All five game's approved Python scoring methods remain research previews, not activated app awards. Preserve 48-hour submission, moderation, frozen season versions, server uniqueness and puzzle identity/mode review constraints for their future assigned phases. No scoring-policy changes were approved during Phase 2.

## Historical handover — Phase 3 / Block 1 / Steps 1–3 (NOW IN PROGRESS; current state in §24)

**Phase 3:** Database, Accounts & Security Foundation (three planned blocks of three steps). Block 1 is the **initial migrations/data model, key/constraint design and migration validation** portion of the approved phase tracker. Keep the first chat strictly to these steps, one verifiable action at a time:

1. **Step 1 — Inspect repository and choose the minimum schema/migration approach.** Start by verifying `4f0220e`, clean Git status, current dependency/config policy, owner-approved Supabase architecture and Phase 1 approved scoring/identity contracts; inspect source before editing. Document target local Supabase CLI/runtime or controlled provisioning decision and how to protect credentials. Record what is actually installed/working rather than assuming cloud services or Docker already exist.
2. **Step 2 — Define initial relational data model and create versioned migrations.** Within the agreed schema scope, specify intended entities, primary/foreign keys, constraints and uniqueness for accounts/profile links, leagues/memberships, games/puzzles, submissions and future season/result/audit entities. Resolve uncertain fields without inventing authenticated puzzle dates or live scores. Clearly distinguish tables actually migrated from design-only entities. No working login/user provisioning, production score API, season engine or UI integration in Block 1.
3. **Step 3 — Run migration/schema tests and record the outcome.** Verify schema application/migration repeatability and structural uniqueness/foreign-key expectations using the runtime that is actually available; assess rollback and security boundary assumptions without claiming RLS/auth enforcement before Block 2. Record commands, real outputs, diffs and commit only after checks pass. If provisioning is blocked, document it as blocked rather than fabricating execution.

**Explicitly deferred to later blocks/phases:** Phase 3 Block 2 Auth/profile and RLS permissions; Phase 3 Block 3 audits/security/recovery; Phase 4 parser/API/real scoring; Phase 5 leagues/seasons; Phase 6 Android/PWA; Phase 7 moderation/standings; Phase 8 deployment; Phase 9 pilot. GitHub remote + actual hosted workflow require separate future validation. Do not create real production secrets in Git or `VITE_` variables. Do not silently award a sample share.

### Next-chat copy/paste starter prompt

> Continue **Puzzle League** from the attached authoritative `Puzzle_League_Project_Guide_v2.1_PHASE2_COMPLETE_PASS_PHASE3_BLOCK1_NEXT_2026-10-11.md` and the actual committed source archive from local Windows Git **`4f0220e`**. Phase 0 COMPLETE; Phase 1 local Python parser/scoring POC COMPLETE / PASS (76/76 regressions, 258 pseudonymised shares across Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion; 35 research files preserved unchanged; zero accepted/awarded); **Phase 2 COMPLETE / PASS**, including Steps 1–6, owner-approved React/TypeScript/Vite + Supabase/Cloudflare/private GitHub/Android-first PWA architecture, 93/93 local Windows tests, production build/browser confirmation, and a clean `main` commit `4f0220e`. The local app is still a placeholder: no database, authentication, backend, real scores or Android Share Target. GitHub-hosted CI has not run. Start **Phase 3 Block 1 / Steps 1–3 ONLY**: inspect the actual repo/environment and agree schema/migration mechanism; create scoped initial relational migrations and constraints; run actual schema validation and capture evidence. Protect server-only secrets; retain all five approved scoring and moderation contracts. Work one verifiable step at a time; do not start Phase 3 Blocks 2–3 or Phases 4–9. End with a newly dated authoritative project checkpoint.

**Source archive command (only after checking tree and privacy, from the existing Windows `puzzle-league` directory):**

```powershell
git status --short --branch
git rev-parse --short HEAD
git archive --format=zip --output=..\Puzzle_League_Phase2_Complete_Commit_4f0220e.zip HEAD
```

Archive should identify commit `4f0220e` and be reviewed before upload. The archive is NOT claimed to have been created or verified in this closing chat. The v2.1 guide is separately downloadable and is not claimed to be part of the Windows commit.


---

# 24. HISTORICAL INTERIM CHECKPOINT — PHASE 3 BLOCK 1 LOCAL SQL PASS, GIT RECONCILIATION THEN PENDING (2026-10-12; SUPERSEDED BY §25)

**Historical authority:** This §24 records the *earlier* state before Linux Git history, local project tests and the GitHub push were verified. It is superseded by **§25** for current state and next action; its formerly pending items must not be read as open. Retained for audit of migration events and the Docker-network correction.

## 24.1 Owner-directed local development location

**Decision / working direction:** Keep the **local development PostgreSQL database on the Linux VMware VM**, rather than moving it to Windows or setting up Windows WSL/Docker Desktop. Linux may host Node/Vite, CLI, Docker and subsequent tests as the principal development platform, while the original Windows Git history is preserved and reconciled. This **does not replace the owner-approved eventual Supabase managed PostgreSQL + Cloudflare Pages production architecture**, and does not make the VM a public production server. VM services are bound to localhost; accessing them directly from Windows requires deliberate safe forwarding or running the browser/editor inside the VM.

- **Confirmed Linux source/work directory:** `/home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e`.
- A project source ZIP was extracted here and verified. **It does not include `.git` history**, as directly reported by the offline script. A second Git repository or independent history must **not** be fabricated or substituted for Windows `main`.
- **Windows verified historical base:** local `main` commit `4f0220e` (earlier `3f87610`); clean working tree when previously checked. The current Linux source includes later Phase 3 changes that are NOT YET COMMITTED to that same history.
- Local Supabase development stack only; no cloud Supabase/GitHub remote/Cloudflare deployment verified. The local database lives in Docker-managed persistent storage and should eventually have a tested backup/export procedure. Never commit database volumes, tokens, secrets, or local `.temp` files to Git.

## 24.2 Block 1 Step 1 — runtime/environment inspection: COMPLETE / VERIFIED LOCAL

- Windows source head `4f0220e` / `main` clean verified before the VM transition.
- Linux VMware: x86_64, 4 vCPU, 10 GiB RAM, ~82 GiB free disk at initial inspection. Initial Windows WSL 2 virtualisation problem bypassed by choosing the already available Linux VM.
- Docker Engine installed, `hello-world` succeeded. Unix socket uses `root:docker`; account `cupitum` was added to the docker group and the active terminal ran `docker ps` successfully without sudo. Docker group grants root-equivalent VM access.
- `nvm 0.40.8`, **Node v24.21.0**, **npm 11.19.0** actually reported on Linux. `npm ci` installed 47 packages; `npm install --save-dev --save-exact supabase@2.120.0` added 8 packages (56 audited; 0 vulnerabilities reported in that run). Project `package.json` / `package-lock.json` therefore changed **on Linux**, not in the original Windows commit.
- `npx --no-install supabase --version` → **2.120.0**. `npx --no-install supabase init` → `Finished supabase init`; created local `supabase/config.toml` and CLI `.temp` working folder.
- Extracted source's `npm run verify:offline` → **8/8 PASS** and preserved the 35-file Phase 1 hash contract. CLI output `Archive has no .git` confirms a source extraction, not a Git checkout. Full `npm run check` on the changed Linux source (including 76 research tests, TypeScript, lint, Vitest and build) has **not yet been shown** for Phase 3 changes; previous 93/93 result is from Windows Phase 2.
- Created Docker network `puzzle-league-local` with bridge host-port default binding `127.0.0.1`; started Supabase using `npx --no-install supabase start --network-id puzzle-league-local`. `docker ps` displayed local published services: API `127.0.0.1:54321`, database `127.0.0.1:54322`, Studio `127.0.0.1:54323`, mail testing `127.0.0.1:54324`, analytics `127.0.0.1:54327`. This is localhost-only host binding in the VM, not a proof of all application security controls.

## 24.3 Block 1 Step 2 — versioned initial schema: APPLIED / VERIFIED LOCAL

**New migration:** `supabase/migrations/20261012170000_phase3_block1_core_schema.sql` (7,820 bytes in the user's extracted package). Created by the prepared Phase 3 migration artifact, **then applied successfully by user command**. Supplementary files: `supabase/tests/phase3_block1_schema_checks.sql` (3,744 bytes), `supabase/seed.sql` (intentionally empty, approved game catalogue inserted in migration), `docs/PHASE3_BLOCK1_SCHEMA.md`.

**Six migrated public tables:**

| Table | Verified scope / key protections |
|---|---|
| `profiles` | `auth.users(id)`-linked public nickname; no public email |
| `games` | Exactly 5 approved games and approved scoring-version references; **not active scoring** |
| `leagues` | Owner profile FK, public/private visibility, timezone required but not validated against IANA list |
| `league_memberships` | History rows, member/moderator values, partial unique index for active `(league_id, user_id)` |
| `game_puzzles` | Game+mode+identity uniqueness; nullable puzzle_day, explicit candidate/verified/rejected state; **not trusted date mapping** |
| `result_submissions` | Immutable raw share via trigger, account/puzzle/game FKs, review status, partial uniqueness for resolved account+puzzle; **not acceptance API or awards** |

Six tables have RLS enabled and **zero RLS policies**, and `anon`/`authenticated` base grants revoked. This is an intentionally non-client-accessible schema awaiting Phase 3 Block 2 authentication and authorisation, not evidence of functioning authenticated permissions. No real users, scoring awards, seasons, audit decision tables or Android share target created.

**Pre-reset read-only inventory:** `auth.users` count `0`; `pg_tables` in public `0`. Initial `npx --no-install supabase db reset --local` did apply migration+seed but failed during service restart. Diagnosis: PostgreSQL container was on `supabase_network_Puzzle_League_Phase2_Complete_Commit_4f0`, while Storage was on `puzzle-league-local`, causing Storage `EAI_AGAIN` DNS errors. The corrected command, **always with custom network**, is:

```bash
cd /home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
npx --no-install supabase db reset --local --network-id puzzle-league-local
```

Owner observed `Applying migration ...`, `Seeding data from supabase/seed.sql`, `Restarting containers`, **`Finished supabase db reset.`** No need to repeat this destructive command now.

## 24.4 Block 1 Step 3 — structural validation and repeatability: PASS / VERIFIED LOCAL

Command run by owner against the local PostgreSQL Docker container:

```bash
DB_CONTAINER=$(docker ps --filter 'name=supabase_db_Puzzle_League_Phase2_Complete_Commit_4f0' --format '{{.Names}}' | head -n 1)
test -n "$DB_CONTAINER" || { echo 'Database container not running'; exit 1; }
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/phase3_block1_schema_checks.sql
```

**Actual result, first application and again after second successful reset:**

```text
BEGIN
NOTICE:  PASS: six tables, deny-default RLS, five games, puzzle uniqueness, FK, submission/membership indexes, raw immutability trigger
DO
ROLLBACK
```

**Repeatability:** Owner executed a second `supabase db reset --local --network-id puzzle-league-local`, observed `Finished supabase db reset.`, then reran the SQL verification and obtained the same `PASS` notice and `ROLLBACK`. This is **evidence of applying the versioned schema from scratch twice**, not proof of rollback of a production migration, actual account permission enforcement, full functional trigger behavior, every possible duplicate edge case or true backup/restore.

**Tests actually covered:** table presence and RLS-on/no-policy metadata, five-game catalogue count + Wordle rule ID, attempted duplicate puzzle and invalid game FK rejection, existence of submission/member unique indexes and raw-share immutability trigger. The SQL test does not yet attempt account/membership/submission conflicts with real user fixtures or exercise the immutability trigger by updating a real submission.

## 24.5 Block 1 exit status and source-control gate

**Technical schema acceptance:** Steps 1–3 on Linux local infrastructure: **PASS at initial structural/migration-repeatability scope**. No application/API/auth or hosted tests are implied.

**Block 1 administrative/source-control completion: OPEN until the following are actually checked and evidenced:**

1. **Restore the original Git history to the Linux source tree safely** (recommended: create a Git bundle from the existing Windows `main` at `4f0220e`, transfer to Linux, and attach its real commit ancestry without overwriting the current Linux migrations/config/package changes). Do not run a fresh unrelated root commit; do not replace/drop local database volumes.
2. Check `.gitignore` for **`supabase/.temp/`** and other generated runtime files; review `supabase/config.toml`, the migration, tests, seed, package.json/package-lock.json and docs. Do not stage credentials, `.env`, `.temp`, database files, Docker volumes or untrusted private chat material.
3. Run full `npm run check` on the updated Linux source and inspect staged changes; commit under the preserved Git history, capture the actual **new** commit SHA and clean status. The existing 35-file Python research manifest must continue passing unchanged. Until that evidence is received, no new Git commit, clean working tree or fully closed Block 1 is claimed.

**Proposed subsequent phase scope, NOT STARTED:** Phase 3 Block 2 Steps 4–6: authenticated profile, backend/RLS permission policies, owner/moderator/member access and local tests. Phase 3 Block 3 Steps 7–9: audit/approval/recovery/security. Scoring/ingestion remains Phase 4; leagues/seasons Phase 5; PWA share target Phase 6; later deployment and pilot phases unchanged.

## 24.6 Immediate next chat/action — Git/source reconciliation ONLY; Phase 3 Block 1 finalisation

**Do not move the live local PostgreSQL database to Windows.** Keep Linux as the single development database host. The next small implementation action is to preserve original Windows Git history and attach it to the already tested Linux working tree before any new feature development. Owner should generate a Git bundle from the still-clean Windows repository and transfer it to Linux. Confirm presence and bundle validity, then reconcile changed Linux files without overwriting them. Follow with full tests and a Linux commit, after which this guide can mark Block 1 **COMPLETE / PASS** and hand over to Block 2 in a fresh chat.

**New-chat starter (only after final Git integration):**

> Continue Puzzle League using the newest authoritative guide (v2.2+). Phase 0, Phase 1 local POC, and Phase 2 are complete. Phase 3 Block 1 initial PostgreSQL migration and structural/second-reset repeatability have passed on Linux VMware with Supabase CLI 2.120.0 and a localhost-bound custom Docker network. Verify the completed Git-history restoration, successful updated full local checks, actual new commit and clean tree before declaring Block 1 closed. Keep the development database on Linux, preserve approved five-game rules and original 35-file research integrity, and do not commence Phase 3 Block 2 authentication/RLS until Block 1 source-control gate closes.

---

# 25. HISTORICAL AUTHORITATIVE CHECKPOINT — PHASE 3 BLOCK 1 COMPLETE / PASS; BLOCK 2 HANDOVER (2026-10-12; SUPERSEDED BY §26)

**Historical authority and boundary:** Owner-provided Windows and Linux terminal outputs from 2026-10-12 closed **Phase 3 Block 1 / Steps 1–3** at the **local database-foundation** scope. This §25 superseded historical §§23–24 handovers **at that time**; its Block 2 NEXT instructions and associated Git-status assertions are now **SUPERSEDED BY §26**. The six-table database has been migrated and tested; **the full Phase 3 is NOT complete**. No new user-facing features, cloud deployment, production credentials, accepted puzzle result, awarded point, operational RLS permission or authenticated login was implemented in this block.

## 25.1 Architecture and development workflow — OWNER DECIDED / VERIFIED AT LOCAL SCOPE

- **Git source of truth:** private `git@github.com:Cupitum/puzzle-league.git`, `main` branch. Windows and Linux each have separately registered GitHub SSH authentication keys; both SSH tests returned `Hi Cupitum! You've successfully authenticated...`. The private repository was created empty; the preserved Windows source history at `4f0220e` was successfully pushed first.
- **Linux Git-history reconciliation:** from existing extracted Linux files, initialized Git metadata, fetched `origin/main`, and used **`git reset --mixed origin/main`** (not `--hard`) to attach the **existing history without overwriting local Phase 3 changes**. Output showed `HEAD 4f0220e`, with only the expected local new/modified files. These changes were then committed on top of the original history as `20d008c`.
- **Main development database:** Linux VMware / Docker-hosted **local** PostgreSQL. Remains on the VM; it is **not moved to Windows** and must not be committed as a volume or dump. Linux code path: `/home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e`. Retain the existing directory; its name is historic and does not change the current Git commit identity.
- **Windows:** secondary Git checkout, last observed `4f0220e` before Linux push. It can later fetch/pull `20d008c`; no post-push Windows pull has been verified. Never force-push, rewrite or reset Windows history to reconcile changes.
- **Cloud/CI:** Private GitHub source push verified, **not** a GitHub-hosted Actions run. Managed Supabase PostgreSQL/Auth and Cloudflare Pages production deployment **NOT STARTED / NOT VERIFIED**. Preserve local-only VM bindings and no client-exposed secrets.

## 25.2 Phase 3 Block 1 — completion evidence per step

| Step | Completion evidence | Status |
|---|---|---|
| **1 — Inspect repo, runtime, migration method** | Verified Windows history/clean `4f0220e`; Linux VM (x86_64, 4 CPUs, 10 GiB), Docker Engine and normal-user access, Node **24.21.0**, npm **11.19.0**, nvm **0.40.8**, Supabase CLI **2.120.0**, local-only `puzzle-league-local` network, Supabase `init` and start. Local published ports **127.0.0.1**. GitHub selected as central source with Windows/Linux independent SSH keys. | **COMPLETE / PASS** |
| **2 — Versioned relational schema** | `supabase/migrations/20261012170000_phase3_block1_core_schema.sql` applied to local PostgreSQL. Six tables: `profiles`, `games`, `leagues`, `league_memberships`, `game_puzzles`, `result_submissions`; five approved game catalogue entries, PK/FK and uniqueness design, structural RLS enabled with **no access policies**. Seed file processed. | **COMPLETE / PASS (local)** |
| **3 — Migration/schema validation, reproducibility and source commit** | SQL verification `BEGIN` → `NOTICE: PASS: six tables, deny-default RLS, five games, puzzle uniqueness, FK, submission/membership indexes, raw immutability trigger` → `DO` → `ROLLBACK`. Repeated after successful second local `db reset`; Linux `npm run check` **93/93 PASS** plus TypeScript/lint/build. Eight-file staged review and whitespace checks PASS. Git commit **`20d008c`** pushed to private GitHub; clean `main...origin/main` reported. | **COMPLETE / PASS** |

**Container networking caution (verified diagnosis):** Initial `supabase db reset --local` recreated the DB on `supabase_network_Puzzle_League_Phase2_Complete_Commit_4f0` while Storage remained on `puzzle-league-local`, causing `EAI_AGAIN` hostname-resolution errors. Corrected local reset, used successfully **twice**, is:

```bash
cd /home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
npx --no-install supabase db reset --local --network-id puzzle-league-local
```

**Safety:** `db reset` is **destructive to local DB data**; do not repeat for convenience, and do not use it for a real/pilot dataset without a backup and reviewed migration strategy. Tests in this block only cover local schema presence, selected constraints, indexes, RLS metadata and trigger presence, not end-to-end permission or integrity behavior.

## 25.3 Local Linux verification — owner terminal output, 12 October 2026

| Command or check | Actual observed outcome |
|---|---|
| `npm run verify:offline` | **8 PASS**, `0 FAIL`; all **35** preserved Phase 1 source hash checks remain satisfied; tracked environment file policy PASS |
| `npm run test:research` | Python **76/76 PASS**, `0 failures` |
| `npm run typecheck` | `tsc -b` PASS |
| `npm run lint` | Oxlint **0 warnings, 0 errors**, 10 files / 96 rules |
| `npm run test` | Vitest v5.0.3, **9/9 PASS**, 3 test files |
| `npm run build` | Vite v8.3.4, **18 modules transformed; build PASS** |
| `npm run check` | **Entire pipeline PASS: 8 + 76 + 9 = 93/93 automated tests**, plus compile/lint/build |
| SQL verification script | PASS after initial successful migration and AGAIN after repeat successful reset; notices above; `ROLLBACK` of test transaction |
| `git diff --check` and `git diff --cached --check` | No whitespace errors reported |
| `git check-ignore -v supabase/.temp/ supabase/.branches/_current_branch` | Both excluded by `.gitignore` (`supabase/.temp/` and `supabase/.branches/`) |
| `git commit -m "feat: establish Phase 3 Block 1 database foundation"` | `[main 20d008c]`, **8 files changed, 986 insertions(+)** |
| `git push origin main` | `4f0220e..20d008c  main -> main` — **SUCCESS** |
| `git log -1 --oneline` | `20d008c (HEAD -> main, origin/main) feat: establish Phase 3 Block 1 database foundation` |
| `git status --short --branch` | `## main...origin/main` — **clean and tracking remote** |

**Committed files (exact owner `git diff --cached --name-only` list):**

1. `.gitignore`
2. `docs/PHASE3_BLOCK1_SCHEMA.md`
3. `package-lock.json`
4. `package.json`
5. `supabase/config.toml`
6. `supabase/migrations/20261012170000_phase3_block1_core_schema.sql`
7. `supabase/seed.sql`
8. `supabase/tests/phase3_block1_schema_checks.sql`

**Integrity limits:** The staged list was precise, and the existing configuration policy checks passed; these checks are **not a comprehensive independent credential scan**. The owner supplied Git metadata and terminal evidence, not proof of every file's security property. The prior prepared Phase 3 ZIP and Phase 2 source archive are **older snapshots**, not identical exports of Linux commit `20d008c`. For any next-chat code inspection, prefer a *fresh archive or GitHub clone/checkout* of `20d008c` instead of either prepared ZIP. This updated v2.3 guide is delivered separately and **not claimed to have been committed** to GitHub.

## 25.4 Block 1 exit gate and outstanding risks

**Block 1 gate: CLOSED / PASS** at the scoped local schema, migration, repository, and automated-verification level.

- Local migration runs and structural SQL assertions are reproducible. Local Supabase services bind to `127.0.0.1` (as last checked).
- The five approved game IDs/scoring-policy references remain catalogued, but their Python parser/scorer is **research-preview-only**; no actual awards or accepted share API.
- `public` schema has six tables with RLS **enabled, zero application policies**, and no public client access granted in the initial migration. This intentionally awaits Phase 3 Block 2; **not** proof of complete least-privilege coverage.
- Account profile creation, real authentication lifecycle, league owner/moderator/member permission enforcement, client access tests, self-approval protection, security and recovery tests, and backup/restore are **open**. More complete direct uniqueness/immutability behavior testing remains for the relevant later block.
- Database is local/development only. No cloud Supabase project/production hosting. GitHub-hosted CI workflow execution **NOT OBSERVED** despite successful push; check Actions status separately before claiming hosted CI PASS. Windows latest checkout **not confirmed updated**.
- `supabase/config.toml` and other committed files require normal ongoing secret review; `.temp` / `.branches`, `.env`, Docker volumes and runtime credentials must never be committed.

## 25.5 Next-chat handover — Phase 3 Block 2 / Steps 4–6 ONLY

**Start in a NEW chat** with this authoritative v2.3 guide and the code at GitHub commit **`20d008c`**. The scope is limited to:

4. **Authentication and profiles:** inspect actual six-table schema, current `auth.users` linkage and relevant Supabase CLI/Auth configuration; implement a minimal, tested authenticated profile lifecycle without public email/login leakage. Do not assume sign-in already works.
5. **Row Level Security:** implement and test real authenticated/anonymous data-access policies (including explicit deny for nonmembers of private leagues) based on actual schema; backend/database policies must control permissions, not just React UI. Do not blindly grant `anon` or `authenticated` access to all tables.
6. **League/member access primitives:** enforce and test owner versus selectively delegated moderator versus member permissions, plus public/private visibility and controlled membership actions. Respect membership eligibility boundaries and document deferred invitation/moderation workflows; no season engine or real points yet.

**Block 2 acceptance target:** Local Auth-to-profile linkage and policy/permission cases PASS under separate roles and anonymous contexts, with a versioned migration, repeatable tests, reviewed limited privileges and clean GitHub commit. If this requires adjusting schema assumptions, inspect then migrate; do not silently edit applied migration. Do not start Block 3 audits/recovery or Phase 4 parser/score API, Phase 5 seasons, Phase 6 PWA, Phase 7 rankings, Phase 8 deployment, Phase 9 pilot.

**Suggested initial checks:**

```bash
cd /home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
git status --short --branch
git rev-parse --short HEAD
npx --no-install supabase --version
npx --no-install supabase status  # redact local secrets/keys before sharing
```

`supabase status` may print credentials — **never paste them unredacted**. Running local services and database contents are intentionally not replicated in GitHub; SQL migrations and verified schema documentation are.

**Copy/paste starter prompt for the next chat:**

> Continue **Puzzle League** from the attached authoritative `Puzzle_League_Project_Guide_v2.3_PHASE3_BLOCK1_COMPLETE_PASS_PHASE3_BLOCK2_NEXT_2026-10-12.md` and source code at private GitHub **`Cupitum/puzzle-league`**, commit **`20d008c`** on `main` (or a fresh privacy-reviewed `git archive` of that commit). Phase 0 requirements COMPLETE; Phase 1 local five-game parser/scoring POC COMPLETE/PASS (76/76 Python tests, 258 pseudonymised samples, zero awards); Phase 2 local app foundation COMPLETE/PASS; **Phase 3 Block 1 / Steps 1–3 COMPLETE/PASS** on Linux VMware: Supabase CLI 2.120.0, versioned six-table PostgreSQL schema, RLS enabled but no active policies, successful SQL structural tests after two clean resets, Linux full `npm run check` 93/93 tests/typecheck/lint/build PASS, eight-file commit `20d008c` pushed to private GitHub with clean `main...origin/main`. The Linux VM is the primary development and local PostgreSQL host; Windows is secondary. GitHub Actions **actual hosted run NOT VERIFIED**; no managed Supabase cloud, functional Auth/profile, accepted results, live awards or Android Share Target. **Start Phase 3 Block 2 / Steps 4–6 ONLY:** inspect the current schema and source; implement minimal Auth/profile lifecycle, RLS policies, and owner/moderator/member permission primitives with local role-based tests. Keep secrets out of Git and browser bundles; do not change frozen game scoring or implement later phases. Validate actual outputs before declaring PASS, commit through the existing Git history, and issue a newly dated next checkpoint.



---

# 26. ARCHIVED AUTHORITATIVE CHECKPOINT — PHASE 3 BLOCK 2 COMPLETE / PASS; OLD BLOCK 3 HANDOVER (2026-10-13)

**Authority:** The owner's actual Linux terminal output throughout 2026-10-13, plus inspected versioned SQL/Python source packages, demonstrates the bounded Phase 3 Block 2 / Steps 4–6 results below. This §26 is the **ACTIVE** project checkpoint; prior §§24–25 handovers are historical evidence only. **Phase 3 overall remains IN PROGRESS; Block 3 / Steps 7–9 has not started.** This guide is a separate documentation deliverable and is **not** claimed to exist in Git commit `1e9f216`.

## 26.1 Verified development/source-control state

- **Primary developer host:** Ubuntu Linux VMware (local Supabase CLI 2.120.0, Docker/PostgreSQL), project path `/home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e`. The directory name is historical and must not be confused with its latest commit. Supabase's local services were previously confirmed bound to VM `127.0.0.1`; current IP/port bindings were not rechecked at Block 2 close.
- **Central source of truth:** private GitHub `git@github.com:Cupitum/puzzle-league.git`, branch `main`. Verified Block 2 progression after Block 1's `20d008c`:
  1. **`5d5fb10`** — `feat: implement Phase 3 Block 2 authenticated profiles` (Step 4), clean/pushed.
  2. **`f01f953`** — `feat: implement Phase 3 Block 2 RLS read policies` (Step 5), clean/pushed.
  3. **`1e9f216`** — `feat: implement Phase 3 Block 2 league permissions` (Step 6), **2 files / 558 insertions**, verified `git push origin main`: `f01f953..1e9f216 main -> main`.
- **Final actual owner output:** `git log -1 --oneline` → `1e9f216 (HEAD -> main, origin/main) feat: implement Phase 3 Block 2 league permissions`; `git status --short --branch` → `## main...origin/main` (clean).
- **Windows:** Secondary checkout; last explicitly evidenced commit remains historical `4f0220e`, with **no confirmed latest pull**. Windows-to-Linux VM file transfer works; Linux-to-Windows file transfer was reported inconvenient. GitHub is the safe source bridge; no extra repository, new root commit or force push is required.
- **Local migration history:** On the owner's Linux VM, `npx --no-install supabase migration list --local` reported matching Local and Remote migration entries for **all four** IDs below ("Remote" here is the CLI's connected local DB migration-history column, **not evidence of managed/cloud deployment**). The latest list showed `20261013220200` present. All new migrations were applied with `supabase migration up --local`, without wiping the local database.

| Migration / source file | Purpose | Actual result |
|---|---|---|
| `20261012170000_phase3_block1_core_schema.sql` | Six initial `public` tables, constraints, five-game catalogue, deny-default foundation | Previously verified PASS, Block 1 |
| `20261013220000_phase3_block2_auth_profiles.sql` | `auth.users` → email-free `public.profiles` trigger and initial profile backfill | Applied; SQL and actual HTTP Auth tests PASS; commit `5d5fb10` |
| `20261013220100_phase3_block2_rls_read_access.sql` | Read-only, selectively granted `anon`/`authenticated` visibility and private-league member helper | Applied; SQL role simulations PASS; commit `f01f953` |
| `20261013220200_phase3_block2_league_permissions.sql` | Moderator roster delegation and owner-governed functions/permissions | Applied; SQL role simulations PASS; commit `1e9f216` |

**Database/object distinctions:** The original **six `public` tables remain**. Step 5 created a private helper schema `app_private` and five read policies. Step 6 added **`app_private.league_moderator_delegations`**, RLS on that private table, `app_private` helper functions and `public` RPC wrappers; this is not a seventh `public` table and is not a complete league administration API. No result-scoring, league creation/joining, seasons, audit workflow or live frontend screens were implemented.

## 26.2 Step 4 — Authentication & profiles — COMPLETE / PASS (local)

**Implemented:** `supabase/migrations/20261013220000_phase3_block2_auth_profiles.sql` installs a `SECURITY DEFINER` trigger on `auth.users` that inserts one linked `public.profiles` entry, with a generated non-email public nickname (`Player-` plus part of the UUID). It backfills missing profiles without overwriting existing ones. No signup metadata/email is copied to `public.profiles`. Normal Auth-user deletion cascades the profile relationship. The trigger function is not directly executable by `anon` or `authenticated`.

**Versioned tests:**
- `supabase/tests/phase3_block2_step4_profile_checks.sql` — supplied owner output: `NOTICE: PASS: Auth user creates one email-free profile; deletion cascades; helper cannot be called by clients`, followed by `ROLLBACK`.
- `supabase/tests/phase3_block2_step4_http_auth_test.py` — owner executed against the running **local** Auth HTTP service; observed four `PASS` messages: signup created an Auth user; password login plus authenticated `/auth/v1/user`; exactly linked email-free profile; disposable account and profile deleted; final `STEP 4 HTTP AUTH / PROFILE SMOKE TEST: PASS`.
- Owner reran `npm run check` after Step 4: **93/93 PASS** (8 Node, 76 Python, 9 Vitest), plus typecheck, lint and build. Two temporary distribution READMEs were deleted; exactly three Step 4 migration/test files were staged, reviewed and committed.

**Boundary:** This is a **real local Supabase Auth API smoke test**, not a frontend login flow, email-verification journey, password-reset test, cloud auth, production account provisioning, or complete account/security test suite. The test account was deliberately deleted; no persistent production account or public email was created in `public.profiles`.

## 26.3 Step 5 — RLS read access — COMPLETE / PASS (SQL-simulation scope)

**Implemented:** `supabase/migrations/20261013220100_phase3_block2_rls_read_access.sql`, which retains RLS on all six public tables and explicitly grants only limited `SELECT` access. Five initial read policies give:

- `anon` and `authenticated`: public `games` catalogue and leagues with `visibility='public'`.
- `authenticated`: only own `profiles` row; only own membership history rows, initially.
- `authenticated`: private-league visibility only if current user owns it or has **active** (`left_at IS NULL`) membership, checked by `app_private.is_current_member(uuid)` using `auth.uid()`.
- No `anon`/`authenticated` direct `INSERT`, `UPDATE`, `DELETE` privileges on these public tables. No client grants or RLS policies for `game_puzzles` or `result_submissions`.

**Versioned SQL test:** `supabase/tests/phase3_block2_step5_rls_read_checks.sql`. Owner output included `NOTICE: PASS: read-only grants, five policies, and closed write/submission boundaries`, and PASS notices for anonymous visitor, league owner, current member, former member, outsider; test completed `ROLLBACK` with no retained fixture records. SQL role/claim simulation exercised policy paths.

**Boundary:** `auth.uid()`/role simulation in `psql` is useful and was verified, but **actual user JWT → PostgREST/HTTP RLS enforcement is NOT TESTED**. The Step 5 tests ran before Step 6's later migration; retest combined policy behavior against the final four-migration schema during Block 3. Do not assert a comprehensive production security audit or HTTP/client-level access gate has passed.

## 26.4 Step 6 — League owner, moderator & member permissions — COMPLETE / PASS (SQL-simulation scope)

**Implemented:** `supabase/migrations/20261013220200_phase3_block2_league_permissions.sql`. New `app_private.league_moderator_delegations` rows link a named privilege (`view_member_roster`) to an **individual membership ID**, not merely a user ID, preventing automatic grant inheritance after leaving and rejoining. An additional RLS policy exposes **active** league roster memberships to owners or explicitly delegated moderators, while preserving self-membership-history access. Privileged functions use restricted `SECURITY DEFINER` checks for the current Auth actor; `public.set_league_moderator` and `public.set_league_moderator_permission` are `SECURITY INVOKER` wrappers with execution granted to authenticated role, not to anonymous role. No direct client writes to existing public tables were enabled.

**Versioned SQL test:** `supabase/tests/phase3_block2_step6_permissions_checks.sql`. Owner output verified:

1. Anonymous users denied role/delegation RPCs and private league; ordinary members cannot read roster or self-grant powers.
2. League owners may appoint/demote current moderators; unsupported delegated privilege names are rejected; unrelated league owners cannot change another league's memberships.
3. A moderator's role alone does not grant roster access or self-delegation; **explicit** `view_member_roster` does, scoped to their league.
4. Revocation restores self-only access. Demotion removes delegated privileges; re-promotion does **not** restore them automatically.
5. Former moderators lose private league/roster access but retain their own membership history; direct-write boundaries remain closed.

The owner's test ended with `ROLLBACK`; no test privileges or memberships remain. The owner then executed `npm run check`: 8/8 offline Node, 76/76 research Python, 9/9 Vitest, `tsc -b` PASS, Oxlint 0 issues, Vite 8.3.4 build PASS (18 modules). Staged review showed exactly the Step 6 migration and SQL test; `git diff --cached --check` had no reported whitespace issue. Committed/pushed **`1e9f216`** with clean remote-tracking status.

**Boundary:** Only owner-driven **existing active membership** moderator role transitions and the single named roster-view delegation are implemented. No league create/join/leave/invite flow, blanket moderator powers, server-side result submission, score awards, seasons or audit moderation actions are implemented. Test assertions have not yet been independently repeated via authenticated HTTP RPC/PostgREST contexts; privileged-function abuse/security review remains Block 3.

## 26.5 Block 2 acceptance & explicit open gates

| Block 2 exit evidence | Verified actual observation | Decision |
|---|---|---|
| Auth-linked profile lifecycle and privacy | SQL transaction test PASS and direct local Auth HTTP signup/login/profile/delete PASS | **PASS** |
| Read policy least privilege and member isolation | Step 5 `psql` role/JWT-claim simulations PASS for anon, owner, current/former member, outsider; denial boundaries checked | **PASS (SQL scope)** |
| Owner-only moderator and selective permission delegation | Step 6 `psql` simulations PASS for appointment, permission grant/revoke, demotion/re-promotion, cross-league and former-member cases | **PASS (SQL scope)** |
| Migrations and source-control chain | Four migration IDs registered in local DB; three Block 2 commits on preserved history; latest GitHub `main` `1e9f216`, clean tracking | **PASS** |
| Repository regression baseline | Latest `npm run check` 93/93 PASS, plus TS, Oxlint and build | **PASS** |
| End-to-end JWT/HTTP RLS + RPC access | Only Step 4 Auth signup/login was HTTP tested; Step 5–6 policies/RPC were SQL simulated | **NOT TESTED — MUST VERIFY in Block 3** |
| Full audit, backup/restore, production and app features | Not within Block 2 | **NOT STARTED / DEFERRED** |

**Block 2 gate: CLOSED / PASS at bounded LOCAL Auth + SQL role-policy implementation scope.** Do **not** reinterpret this as Phase 3 overall PASS, completed production least-privilege audit, live authenticated app, cloud deployment, or verified browser/client authorization. Phase 3 remains **IN PROGRESS** until Block 3 finishes its separate security/recovery acceptance.

**Outstanding risks, to carry forward unchanged where applicable:** real JWT-context PostgREST policy behavior, direct and via-RPC function abuse checks, SQL privilege/grant hygiene, policy recursion and private schema exposure review, cross-league leakage under representative fixtures, full audit/approval immutability, backup+restore proof, non-destructive migration validation, managed Supabase deployment, GitHub-hosted CI job status, Windows checkout freshness, trusted result ingestion/duplicate enforcement, verified puzzle dates/modes, season processing, PWA Share Target, actual pilot and scoring. Existing Python `scoring.py` and 35-file source preservation hashes remain intact; five approved scoring policies are **not yet production awards**.

## 26.6 ARCHIVED OLD HANDOVER — superseded by §27 (accelerated Phase 3 complete package)

**Next-chat scope:** Strictly **Phase 3 — Database, Accounts & Security Foundation, Block 3, Steps 7–9**. Start only after opening this v2.4 guide in a *new* conversation and inspecting real source at `1e9f216` and the current VM database. Keep Linux VM as the development PostgreSQL host. Do not start Phase 4 or later features during Block 3.

7. **Audit and approval infrastructure:** Inspect actual migrations, `result_submissions` and current moderator/security functions. Design and apply narrowly-scoped versioned tables/constraints for future `approval_requests`, `approval_decisions`, `result_audit_events` (and any objectively necessary integrity fields), with actor/action/time, immutable history and least-privilege server-only mutations. These are **infrastructure**, not activation of an unbuilt result submission/score-correction workflow. Do not silently declare unapproved policy/actor behavior settled.
8. **Security verification under real auth contexts:** Execute direct anonymous/authenticated **HTTP-level/PostgREST** RLS access tests for public/private leagues, profiles, member self/history, owner/delegated active rosters, revoked/expelled/former users, foreign leagues and RPC misuse. Include role-specific negative writes, private helpers and function grants; repeat applicable Step 5–6 SQL tests on the final migration set. Use disposable users/leagues, clean-up or rollback, no plaintext credentials in logs or repository. This remains **OPEN** until evidenced; a successful database-only `SET ROLE` simulation is not equivalent.
9. **Migration integrity, recovery & close Phase 3 gate:** Validate forward migrations non-destructively, database backup/export and a **separate restore-test database** or disposable environment, verify schema and critical row integrity, repeatability/security regression, `npm run check`, and commit/push only after review. Do not run `supabase db reset` against the ongoing development data without a verified backup and explicit decision. Record limitations, test outputs, final commit, remote status, and Block 3/Phase 3 gate verdict. If any gate remains unverified, keep the phase OPEN.

**Source entry point:** Private GitHub `git@github.com:Cupitum/puzzle-league.git` `main` at **`1e9f216`**. Inspect `supabase/migrations/` (four migrations), `supabase/tests/` (baseline, Step 4 SQL+Python HTTP, Step 5 SQL, Step 6 SQL), `docs/PHASE3_BLOCK1_SCHEMA.md`, `package.json`, `supabase/config.toml`, and preserve `research/phase1-approved-local-poc/` unchanged. Source archives of `20d008c` or earlier are obsolete for implementing Block 3. The guide is **not executable source** and is not guaranteed committed to GitHub; if code cannot be accessed, request a fresh privacy-reviewed archive of `1e9f216`.

**Suggested non-destructive opening checks on Linux:**

```bash
cd /home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
git status --short --branch
git rev-parse --short HEAD
npx --no-install supabase migration list --local
# Optional: npx --no-install supabase status; REDACT its URLs/keys/secrets before sharing.
```

**STARTER PROMPT — COPY INTO THE NEXT CHAT:**

> Continue **Puzzle League** using the attached authoritative **`Puzzle_League_Project_Guide_v2.4_PHASE3_BLOCK2_COMPLETE_PASS_PHASE3_BLOCK3_NEXT_2026-10-13.md`**. Phase 0 requirements COMPLETE; Phase 1 five-game parser/score preview POC COMPLETE/PASS (76 tests, 258 pseudonymised samples, zero accepted/awarded); Phase 2 local repository foundation COMPLETE/PASS; Phase 3 Block 1 initial six-table local PostgreSQL schema/migration COMPLETE/PASS; **Phase 3 Block 2 Steps 4–6 COMPLETE/PASS at verified LOCAL scope**: Auth/profile SQL and actual local HTTP signup/login/profile/delete test PASS; RLS public/private read policies and owner/delegated moderator roster permissions PASS in rollback-only PostgreSQL role simulations; four migrations registered; Linux `npm run check` 93/93 PASS; source commits `5d5fb10`, `f01f953`, **`1e9f216`** pushed to private GitHub `Cupitum/puzzle-league`, latest `main` `1e9f216`, clean. **Phase 3 overall IN PROGRESS.** RLS and RPC authorisation against real authenticated HTTP requests, audit/approval data infrastructure, backups/restore and security/recovery checks are NOT VERIFIED. **Start Phase 3 Block 3 / Steps 7–9 ONLY**: Step 7 audit/approval infrastructure; Step 8 actual HTTP/JWT RLS/RPC and adversarial security verification; Step 9 backup/restore, non-destructive migration/recovery validation and final Phase 3 gate. Inspect the current code/schema before editing; one verifiable action at a time; protect credentials; no destructive resets, production claims, score awarding, Phase 4 API/scorer, Phase 5 seasons, Phase 6 PWA, deployment or pilot work. End with true test/commit evidence and a new Markdown checkpoint.

**Scope reminder:** GitHub-hosted CI success was not observed; source push does not demonstrate Actions PASS. Managed Supabase cloud project and Cloudflare Pages are still not deployed. Windows may not have pulled `1e9f216`. Local game catalogue/scoring references are not a functional puzzle app.


---

# 27. ACTIVE AUTHORITATIVE CHECKPOINT — ACCELERATED ROADMAP / PHASE 3 COMPLETION NEXT (2026-10-14)

## 27.1 Approved change: fewer phases, larger first-response code packages

**Owner instruction received 2026-10-14:** Reduce the number of phases; implement much larger parts at once; verify only at the **end of a phase**; put **all implementation code in the first reply** of each new implementation chat, except where essential questions or decisions must first be resolved. This explicit decision supersedes §1 rules 2–3, the old §7 phase/block cadence, the historical §12 handover and §26.6's instruction to deliver Block 3 in small steps. It does **not** supersede privacy, audit, authentication, least privilege, database integrity, verified puzzle identity, frozen scoring, safe backups, or truthful PASS/NOT TESTED requirements.

**Interpretation:** The assistant should prepare a complete, integrated artifact up front after inspecting current code. It should test internally where possible and hand off one orchestrated installation plus **consolidated final acceptance**. The user should not be asked to repeatedly paste routine test output after each migration. If the integrated run fails, switch to targeted debugging; if credentials or irreversible actions are needed, obtain the necessary decision or user action. The app is not considered verified merely because the code is provided.

### Active roadmap: four remaining phases

| Active phase | Deliverable package (one main build) | Mandatory end-of-phase acceptance | Status |
|---|---|---|---|
| **3 — Security and Database Completion** | Audit/approval immutable infrastructure; correctly scoped schema/functions/grants; real anonymous/authenticated HTTP RLS and RPC adversarial tests; safe local backup/isolated restore and forward-migration recovery scripts | Migrations applied without wiping working DB; live JWT/PostgREST role tests PASS including negative permission paths; secure immutable auditing verified; backup/restore verified separately; `npm run check` and all SQL checks PASS; clean source commit | **COMPLETE / PASS locally, commit `9b5a40a`** |
| **4 — Complete Competition Backend** | Production-bound parser integration for five approved games; authoritative server submission/validation/scoring; game/puzzle identity + review routing; duplicate prevention; leagues, invitations, join/leave/rejoin; eligibility; calendar/rolling season snapshots, auto-renewal and finalisation; moderation/corrections as necessary to protect awards; separate per-game/combined leaderboard data | Actual authenticated API and database integration tests, isolation/idempotency, five-game scoring, invalid/ambiguous review, no early awards, date/mode guards, multi-league membership windows, two-season rollover, historical and 48h cases; regressions PASS | PLANNED |
| **5 — Android-first PWA and Competition Experience** | Full React app: account/profile, leagues/membership/seasons, share/paste result review and confirmation, rankings, streak/history, invitations and moderation review UI; installable manifest/service worker/Android Share Target; responsive/accessibility/error/offline handling | Real device HTTPS/installed PWA Android Share Target → preview/confirmation → trusted server test, paste fallback, public/private isolation, player/moderator usability, accessible layouts and negative cases PASS | PLANNED |
| **6 — Production Release and Pilot** | Supabase managed/Cloudflare Pages configuration and automated deployment, GitHub Actions executed, secrets and migration controls, observability, operational backup/restore, end-to-end/security/accessibility tests, five-game pilot (~5–10 users), fixes, season closure and release documentation | Confirm hosted workflow, secure HTTPS deployment, production migration/backups/recovery, verified onboarding and real player results, monitored pilot, end-to-end scoring/season reconciliation and release criteria PASS | PLANNED; real pilot may need additional calendar time and corrective iterations |

**Original task coverage is preserved**: former Phase 4 and 5 tasks are integrated into new Phase 4; former Phase 6 and 7 into new Phase 5 (with trusted moderation backend begun in Phase 4); former Phase 8 and 9 into new Phase 6. Historical Phase 3 final security/recovery obligations remain in Phase 3. Original Phase 0–2 IDs/historical completion evidence remain unchanged. New phases do not skip any required product capability or security gate.

## 27.2 Required implementation package format for EACH remaining phase

The **FIRST substantial reply** of a new implementation chat should, barring missing critical input, include:

- **One comprehensive downloadable ZIP (or precise patch) anchored to the actual latest source commit**. It must contain complete, versioned migrations, source code, functions, TypeScript/Python tests, SQL tests, fixture/sample policies, documentation and scripts required for that phase. Do not prepare patches against stale `20d008c`/`4f0220e` source; inspect `1e9f216` or newer source. Do not edit previously applied migrations in place.
- A brief **file/change manifest** plus explicitly deferred areas; no fictitious production readiness or placeholder critical functions declared as completed. Preserve original Phase 1 research files byte-for-byte and all five approved score mappings.
- **One safe apply/runbook** from the actual Linux VMware repository, with preflight assertions (Git status/commit, paths, runtime, migration state), backups where relevant, ordered application and **fail-fast** behavior. Avoid secrets embedded in artifacts, shell history, Git or browser build. Never automatically wipe user data. Windows is a file-transfer/display environment; Linux VMware remains the authoritative local DB.
- **One end-of-phase verification** (ideally one script/command that runs the relevant SQL, HTTP/session, Python/Node/TypeScript/build/security checks and summarizes PASS/FAIL). It may comprise many automated subtests. The user reports the final consolidated result, not a step-by-step drip of ordinary outputs. Actual Android/cloud/pilot gates, where impossible to automate, must be listed separately and independently evidenced.
- On verified PASS only, a review/commit/push procedure with exact outputs to capture and a revised authoritative project guide for the next phase. Remote GitHub-hosted Actions must be observed separately from source push.

**End-of-phase verification timing is a communication preference, not permission to omit tests.** The code package itself should include automated test suites and exercise them during preparation where possible. Risky migrations must still fail fast, preserve current data and permit recovery. Any security critical test failure prevents PASS or release. If code is not yet available, explicitly label `PREPARED / NOT VERIFIED ON OWNER VM`.

## 27.3 Phase 3 completion — combined package requirements (NEXT CHAT)

**Entry evidence carried forward, NOT requiring routine re-verification one test at a time:** Local Supabase CLI 2.120.0, Node 24.21.0, npm 11.19.0; PostgreSQL Docker on Linux VMware; prior four migrations `20261012170000`, `20261013220000`, `20261013220100`, `20261013220200` applied and registered; `auth.users`→profile and real Auth HTTP lifecycle PASS; SQL `SET ROLE` RLS/owner/moderator/member simulations PASS; `npm run check` 93/93 PASS; current latest GitHub `main` **`1e9f216`**, clean. These are prior verified observations, not guaranteed to be current at the moment the next phase package is installed.

**Implement together:**

1. Versioned audit/approval data models and integrity safeguards, designed against the **actual** `result_submissions` schema and security functions. Provide actor/action/time/rationale, strict mutation roles, append-only histories, protective constraints and safe corrections. Do **not** activate a scoring API, award points or pretend owner-self-approval exception policy is settled.
2. End-to-end local Supabase HTTP tests with **real disposable Auth sessions/JWT claims** and PostgREST/RPC calls: anonymous vs authenticated public/private league access; current/former/foreign memberships; owner/moderator permission issuance/revocation; roster data; direct table insert/update/delete denials; unexposed helper functions; RPC abuse; cross-league isolation; least privilege and cleanup. Preserve personally identifying secrets.
3. Safe non-destructive migration workflow, DB backup/export, **separate restore target** and verification of migrated data/row/schema integrity; avoid `supabase db reset` on live development state. Supply failure recovery instructions. Re-run established SQL test suite and `npm run check`, plus added tests.
4. Integrate code, tests, scripts and documents in **one complete deliverable** and provide **one consolidated owner verification gate** and eventual review/commit/push. If any gate fails, leave Phase 3 OPEN with precise evidence.

**Owner action needed before beginning (only if necessary):** Provide a **current privacy-reviewed Git archive of commit `1e9f216` or newer** in the new chat unless the assistant can actually access the up-to-date private repository through an authorised connected source. Older archived source is insufficient for safely editing applied auth/RLS/security migrations. No user secrets or local database dumps should be uploaded.

## 27.4 Current verified state vs future targets

**VERIFIED (as of last owner output 2026-10-13):** clean `main`/`origin/main` at `1e9f216`; four local migrations; Auth/profile SQL and local Auth HTTP smoke test; RLS/read and delegated moderator SQL role simulations; 93/93 project tests and build.

**NOT VERIFIED / NOT IMPLEMENTED:** Real HTTP/JWT RLS and permission RPC tests; comprehensive abuse/privilege audit; audit approval/correction database infrastructure; backup/restore verification; GitHub-hosted Actions PASS; managed Supabase and Cloudflare production; result submission/score awards; validated official date/mode policies; actual leagues/seasons; PWA/Share Target; pilot.

**No product-rule change:** Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion, participation point, fixed score formulas, the 48h normal deadline, season snapshots, multi-league one-submission rule, historical exception approval and moderation rules are unchanged.

## 27.5 Copy-paste starter prompt — NEXT IMPLEMENTATION CHAT

> Continue **Puzzle League** using the uploaded authoritative `Puzzle_League_Project_Guide_v2.5_ACCELERATED_ROADMAP_PHASE3_COMPLETION_NEXT_2026-10-14.md`. **The owner approved a faster workflow on 2026-10-14:** fewer phases, substantially larger implementation batches, **all code and tests prepared in the FIRST substantive reply of each implementation chat** unless essential decisions/current code are unavailable, and **one consolidated owner-side verification at the END of a phase** rather than per-migration back-and-forth. The new roadmap has FOUR remaining phases: **Phase 3 database/security/recovery completion; Phase 4 complete trusted competition backend; Phase 5 Android PWA/results/leaderboards/moderation UI; Phase 6 hosted deployment, pilot and release**. Historic phases 4–9/18 remaining blocks are superseded, though their obligations remain. Phase 0–2 complete; Phase 3 foundation/Auth/RLS/owner/moderator controls locally tested, four migrations registered; local `npm run check` 93/93 PASS; latest private GitHub `Cupitum/puzzle-league` commit `1e9f216`, clean. **Current work: Phase 3 completion ONLY.** Inspect the actual up-to-date repo (attached archive or authorised connector), all migrations and security functions; produce in the **first implementation response** one complete downloadable ZIP/patch implementing audit/approval integrity, real Auth/JWT HTTP RLS/RPC negative/positive testing, isolated backup/restore plus safe migration/recovery, tests and documentation. Include fail-fast safe application and ONE end-of-phase verification command. Preserve score policies and research hashes. Do not run destructive resets, expose secrets or start Phase 4; mark owner-side results NOT TESTED until actual evidence. When Phase 3 truly passes, record the final Git commit and update the checkpoint for Phase 4.

**Workflow decision is effective immediately.** Issuing this guide does **not** imply any new source change, migration, test run, Git commit, cloud provisioning or Phase 3 completion.

---

# 28. HISTORICAL PREPARED CHECKPOINT — PHASE 3 CONSOLIDATED COMPLETION PACKAGE (2026-10-14; SUPERSEDED BY §29)

**Historical status at packaging time:** IMPLEMENTATION PACKAGE PREPARED AGAINST ACTUAL SOURCE ARCHIVE, **THEN NOT YET VERIFIED ON THE OWNER VM.** This section supersedes §27 only as the immediate package-install/acceptance handover. Earlier verified checkpoints, approved product decisions and accelerated roadmap remain authoritative.

## 28.1 Exact source anchor

The source archive `Puzzle_League_Current_Source.zip` carries ZIP comment identifying the full Git commit `1e9f216577b116d05d2cda924ba3651b5efbc820`. Archive inspection confirmed the four already applied migration files, five SQL/Python tests, current local config, and preserved 35-file research package. No user DB volumes, secrets, live GitHub CI results or Auth tokens are included. This anchor is **archive evidence**, not a new live GitHub fetch or a successful current user-VM Git check.

## 28.2 New artifacts created for Phase 3 completion

Prepared one new forward-only SQL migration, version `20261014150000`, implementing private approval requests/decisions and append-only security audit events with role, delegation, submission and approval triggers. Preserved all previous migrations and frontend/research files unchanged. Added `supabase/tests/phase3_final_sql_security_checks.sql` and `phase3_real_jwt_http_security.py`, requiring real local Auth JWTs; scripts for preflight, non-destructive migration, full local backup, isolated application-schema restore with fingerprints, one consolidated verification and SHA preservation; plus `docs/PHASE3_COMPLETION_RUNBOOK.md`.

**Packaging decision:** One additions-only ZIP with `APPLY_TO_REPO.sh` and docs. The operator applies files to the existing clean Git repository using the full commit SHA guard. The runner backs up first, applies only local pending migrations, then runs **one owner acceptance script** (`bash scripts/phase3/verify.sh`). Full source replacement / Git init / local DB reset is forbidden. Exact apply details are in the runbook.

## 28.3 Evidence boundary

- **Author-side checks:** archive path/hash inspection, shell/Python syntax and previous Node/Python regression suites should be captured in the accompanying package report. No direct PostgreSQL/VM testing was possible here.
- **NOT RUN / OWNER VERIFICATION PENDING:** new migration in actual local Supabase Postgres; signed-JWT PostgREST and RPC authorization; audit immutable behavior in database; isolated restore test; full current TypeScript/lint/Vitest/build pipeline on owner's VM; Git diff review, new commit/push; GitHub-hosted CI result.
- **NOT STARTED:** Phase 4 trusted scoring and league/season engine; Phase 5 PWA and Android sharing; Phase 6 cloud hosting and pilot. No point has been awarded by this package.
- **Explicit safeguard:** owner-self-review policy and decision/RPC authorization are not silently invented. Approval tables remain server-only groundwork with no active decision API; actual moderation transitions require the Phase 4 trusted backend.

## 28.4 Owner action and close gate

1. Extract the additions-only ZIP outside Git tree; run `APPLY_TO_REPO.sh` against the existing Ubuntu repository at `1e9f216` while Git is clean.
2. Run `bash scripts/phase3/apply.sh`. A full local DB archive is taken outside Git before the forward-only `supabase migration up --local`.
3. After application, run one `bash scripts/phase3/verify.sh`. It must show PASS across SQL rollback checks, Auth HTTP, real-JWT PostgREST/RPC, immutable audit, isolated restore, full app pipeline and source-file hashes.
4. Only on actual PASS review staged names/secret-safe diff, commit/push original history and update this checkpoint to **Phase 3 COMPLETE / PASS** with actual logs and commit. On failure, keep **Phase 3 OPEN** and debug the failing gate; do not claim success from delivered code.

**Next phase only after real PASS:** Phase 4 — Complete Competition Backend (five-game trusted parsing/validation/scoring and multi-league/season workflows) as one consolidated implementation package.

---

# 29. HISTORICAL VERIFIED CHECKPOINT — PHASE 3 LOCAL ACCEPTANCE PASS / GIT CLOSEOUT THEN PENDING (2026-10-14; SUPERSEDED BY §30)

**Authoritative current status:** **PHASE 3 IMPLEMENTATION AND LOCAL CONSOLIDATED ACCEPTANCE: PASS** on owner Ubuntu VMware, 14 October 2026. **FINAL SOURCE-CONTROL CLOSEOUT: PENDING**, so Phase 3 is not yet recorded as fully administratively closed and Phase 4 has not started. This §29 supersedes the planned/pending states in §§7, 10, 26–28 as they relate to *current* Phase 3 status; their time-stamped historical evidence and approved product rules remain intact.

## 29.1 Applied change and repair history

- Source anchor before new Phase 3 changes: actual existing Git checkout at `1e9f216577b116d05d2cda924ba3651b5efbc820`; `APPLY_TO_REPO.sh` reported `PASS: installed additions-only Phase 3 package`. The local ignored VMware entry `hgfs` did not require deleting or resetting anything.
- Owner executed `bash scripts/phase3/apply.sh`: original commit, container and four baseline migrations verified; migration files remained byte-identical; a private full backup was created outside Git; `20261014150000_phase3_security_audit_infrastructure.sql` applied non-destructively with `supabase migration up --local`; reported `PHASE 3 LOCAL FORWARD MIGRATION: APPLIED`.
- First consolidated run correctly **FAILED** on the isolated restore: `pg_restore` attempted Supabase-managed `DEFAULT ACL` objects whose owner was `supabase_admin`, and the restore session lacked permission to change default privileges. This was a **restore-tooling failure**, not a reported main-database corruption or a migration failure. Failed disposable database `phase3_restore_212571b8eb` was left for diagnosis.
- The owner applied the targeted `APPLY_RESTORE_HOTFIX.sh` successfully. Only `scripts/phase3/backup_restore_verify.py` was replaced following its expected SHA guard; **no new migration/database object changed**. The correction excluded archived `DEFAULT ACL` records in the *disposable restore* only, retaining existing-object ACL entries and verifying permission behavior. The owner then reran the single consolidated acceptance command.

## 29.2 Final owner-provided acceptance evidence

| Gate | Owner's final observed result | Status |
|---|---|---|
| Preflight and migration integrity | Original Git anchor, local DB container, original four migrations byte-identical; five migration records available in source DB | **PASS** |
| Existing Auth/profile SQL and HTTP | SQL tests PASS; real disposable Auth signup, password login, `/auth/v1/user`, linked email-free profile and cleanup PASS | **PASS** |
| Existing RLS/permission SQL | Original Step 5 and 6 SQL rollback-only checks PASS, including anonymous, owner, member, former member, delegated moderator, revocation, demotion and cross-league denial cases | **PASS** |
| New audit/approval security SQL | `NOTICE: PASS: current schema, six public policies, approved scores, least privilege, immutable audit and approvals` | **PASS** |
| Real signed-JWT/PostgREST security | Five distinct disposable real sessions; public/private views, membership history, roster, RPC delegation/revocation, cross-league isolation and forbidden DML tests; `PHASE 3 REAL JWT/POSTGREST SECURITY: PASS` | **PASS (local HTTP)** |
| Full backup and isolated application restore | Private complete and app-specific dumps created; restore excluded six `DEFAULT ACL` definitions but preserved existing-object ACLs; ten app-table fingerprints matched; `PHASE 3 BACKUP / ISOLATED RESTORE: PASS` | **PASS (bounded local rehearsal)** |
| Offline and research tests | 8/8 Node offline + 76/76 Python research PASS | **PASS** |
| Frontend tests/quality | 9/9 Vitest PASS; TypeScript `tsc -b`, Oxlint 0 warnings/errors, Vite 8.3.4 production build PASS | **PASS** |
| Source fidelity/static checks | 35 preserved Phase 1 research hashes PASS; four original migration files byte-identical; Phase 3 package security/static invariants PASS | **PASS** |
| Consolidated phase command | `PHASE 3 CONSOLIDATED LOCAL ACCEPTANCE: PASS` | **PASS** |
| Review, new local commit, `git push`, clean `main...origin/main` | Not yet supplied by owner | **PENDING — CLOSEOUT REQUIRED** |
| GitHub-hosted Actions / managed Supabase / Cloudflare / real pilot | No hosted execution/deployment/pilot evidence | **NOT VERIFIED / LATER PHASE** |

**Backup evidence retained privately off repository:** complete `phase3_local_full_20261014T161614Z_213cb4.dump` SHA-256 `4cf6e89856dfa0c892467770278f7aafcb697b534741a02eb8145903b0ca4bf1`; application `phase3_local_app_20261014T161614Z_213cb4.dump` SHA-256 `3ae1c0916e04f07f55341697df108b0d3d3f03a8601918666913bb0984d20624`. No backup contents, credentials, test-user secrets or dumps should be uploaded to Git, remote repositories or public chats. The restore verifies app-schema/data and selected ACL/RLS behavior inside the same local PostgreSQL cluster; it does **not** prove whole-platform Supabase Auth/Storage recovery, off-host backup resilience or production disaster recovery.

## 29.3 Scope actually delivered / not delivered

- **Delivered and locally validated:** server-only approval-request/decision and immutable audit/event infrastructure, protective grants, privilege/role event auditing, real local HTTP Auth/RLS/RPC security suite, non-destructive forward migration, local full backup, independent disposable application-schema restoration, integrated acceptance and preservation tests.
- **Not activated:** trusted submission API, results verification, date/mode validation, scoring, league/season eligibility, public result awards, real moderation approvals/corrections, and owner-self-dispute adjudication. The new approval tables are infrastructure and cannot be represented as a working moderation product.
- **Not deployed/tested:** managed Supabase, Cloudflare Pages, browser login UI, Android PWA or Share Target, actual GitHub-hosted Actions execution, real user/pilot activity. Do not represent local `npm run check` as a remote CI run.
- **No scoring changes:** Approved Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion score mappings, +1 accepted participation, 48-hour window, season rules, historical exception routing and multi-league single submission remain unchanged.

## 29.4 Final Git review and closure instructions

From the **existing** Ubuntu checkout (do not create a new Git repository, reset or force push), inspect exact staged names/content and confirm the modified restore script is the *hotfixed* version, not the original prepared version. Stage only the 13 Phase 3 additions: one migration, two new tests, two docs (including the v2.6 historical prepared snapshot), and the eight `scripts/phase3` files. Optionally copy and stage this v2.7 guide inside `docs/` for audit, but it remains a separate downloadable authoritative guide until the owner confirms its commit. Do not stage `hgfs`, `.env`, `.temp`, Node caches, secret outputs, full/app backup archives, or diagnostic database data. After staged diff/secret review, run whitespace checks, commit and push `main` normally, and verify `HEAD=origin/main` with a clean tree. Capture actual commit ID and result of push. Keep GitHub-hosted CI marked NOT VERIFIED until an actual hosted job result is observed.

**On confirmed Git closeout:** mark Phase 3 **COMPLETE / PASS (LOCAL IMPLEMENTATION)** and issue next version of the authoritative guide with the actual new Git commit. This is not a production security certification or hosted launch.

## 29.5 Conditional next phase — Phase 4 complete competition backend

**START ONLY after the Phase 3 source-control closeout is evidenced.** In a **new chat** provide this updated guide **plus a fresh `git archive` from the new committed `main`** (or authorised current repository access); Phase 3's original `1e9f216` archive is now obsolete. Prepare **one complete Phase 4 code package in the first substantive implementation response**, not an incremental block series, anchored to that new source:

1. Five owner-approved game parsers and deterministic score calculation inside trusted backend; preserve original share, parser version and explicit date/mode/identity validation or review routing.
2. Authenticated single-result submission with server duplicate prevention, safe corrections/historical approvals and auditable status changes; no pending/invalid scores paid early.
3. Leagues, private/public invitation/join/leave/rejoin and membership eligibility boundaries; role/delegation enforcement and cross-league integrity.
4. Calendar/rolling seasons, frozen scoring/game snapshots, scheduled changes, 48-hour late window, approval-dependent review/finalisation, idempotent automatic renewal, and individual-game/combined leaderboards.
5. One safe non-destructive application pathway and one consolidated owner-run Phase 4 acceptance gate that verifies all five games, real signed-in API tests, multi-league scoring, negative permissions, two-season rollover, research preservation and regression/build.

**Copy-paste new-chat starter after actual Git push:**

> Continue Puzzle League using the latest Phase 3 COMPLETE guide and a fresh source archive from the final committed GitHub `main` (new commit to be recorded). Phase 3 locally passed comprehensive SQL/audit tests, five real Auth/JWT sessions with PostgREST/RPC security, an isolated ten-table restore with preserved application ACLs, and `npm run check` with 93 tests plus build. Phase 0–2 remain complete and all five approved scoring rules unchanged. Follow the 2026-10-14 accelerated roadmap: **Phase 4 Complete Competition Backend in one substantive, full-source, first-reply deliverable**; server-authoritative five-game parsing/scoring, one submission across leagues, identity/mode and 48-hour validation/review, leagues/membership, calendar/rolling seasons/renewal/finalisation, moderation/corrections, and individual/combined standings. Preserve database and security history; do not implement Phase 5 UI/PWA or Phase 6 deployment/pilot yet. Include a single consolidated acceptance gate. Do not claim hosted CI or production deployment from local tests.


---

# 30. ACTIVE AUTHORITATIVE CHECKPOINT — PHASE 3 COMPLETE / PASS; PHASE 4 NEXT (2026-10-14)

**Authority:** Actual owner Ubuntu Linux VMware terminal outputs for the Phase 3 consolidated acceptance and final Git closeout on 14 October 2026. **This section supersedes all earlier status/next-action statements where they conflict, including §§7, 10, 26–29.** Historical records remain for chronology; no earlier verified evidence is removed. The acceleration decision remains active, but its **remaining implementation phases are now 4, 5 and 6**.

## 30.1 Final Phase 3 source control — VERIFIED

| Item | Actual owner evidence | Decision |
|---|---|---|
| Source baseline before Phase 3 completion | `1e9f216577b116d05d2cda924ba3651b5efbc820` | VERIFIED previous commit |
| Additions staged | Exactly **13 new files**, all `A` and under `docs/`, `scripts/phase3/`, `supabase/migrations/`, or `supabase/tests/` | PASS |
| Whitespace check | `git diff --cached --check` produced no error output | PASS |
| Staged diff | **13 files changed; 2,385 insertions**, no reported deletions | PASS |
| Commit | `[main 9b5a40a] feat: complete Phase 3 security audit and recovery` | PASS |
| Remote push | `1e9f216..9b5a40a  main -> main` to `github.com:Cupitum/puzzle-league.git` | PASS |
| Final log | `9b5a40a (HEAD -> main, origin/main) feat: complete Phase 3 security audit and recovery` | PASS |
| Final working tree | `git status --short --branch` → `## main...origin/main` | **CLEAN / PASS** |
| Remote hosted GitHub Actions job | No run log, conclusion or workflow URL supplied | **NOT VERIFIED** |

**Exact tracked additions:**

- `docs/PHASE3_COMPLETION_RUNBOOK.md`
- `docs/PROJECT_GUIDE_v2.6_PHASE3_PREPARED.md` *(historical pre-acceptance checkpoint; this v2.8 guide is issued separately)*
- `scripts/phase3/apply.sh`
- `scripts/phase3/backup_restore_verify.py` *(includes successful targeted restore hotfix)*
- `scripts/phase3/local_db.py`
- `scripts/phase3/package_integrity.py`
- `scripts/phase3/preflight.py`
- `scripts/phase3/source_baseline_test.py`
- `scripts/phase3/static_tests.py`
- `scripts/phase3/verify.sh`
- `supabase/migrations/20261014150000_phase3_security_audit_infrastructure.sql`
- `supabase/tests/phase3_final_sql_security_checks.sql`
- `supabase/tests/phase3_real_jwt_http_security.py`

No evidence was provided of staging VMware `hgfs`, a database dump, credentials, or changes to the 35 protected research files. The user-reported staged file list contains only the 13 expected paths. The unchanged-byte research and original migration evidence also passed the acceptance runner.

## 30.2 Phase 3 acceptance verdict — CLOSED / PASS AT LOCAL SCOPE

- **Migration:** `20261014150000_phase3_security_audit_infrastructure.sql` applied non-destructively after a private backup. Local migration history shows **five** applied migrations. Original four migration files preserved byte-for-byte.
- **Audit and approval foundation:** immutable/security-protected database infrastructure and least-privilege policy SQL assertions passed. It is infrastructure, **not** a completed user-facing moderation or award processing workflow.
- **Real API permissions:** disposable real Supabase Auth users and five JWT sessions validated anonymous/current/former/foreign league access, profiles, owner/moderator delegation and revocation, forbidden direct writes, cross-league isolation and hidden helper denial. `PHASE 3 REAL JWT/POSTGREST SECURITY: PASS`.
- **Backup/restore:** full private and app-specific dumps produced. Disposable app-schema restoration and fingerprints across **ten application tables** passed; six Supabase-owned default privilege records excluded while existing-object ACLs retained. `PHASE 3 BACKUP / ISOLATED RESTORE: PASS`. This is not a full managed-platform/disaster-recovery claim. Historical failed diagnostic target `phase3_restore_212571b8eb` was previously retained; cleanup was not verified and must not be presumed.
- **Regression and build:** **8/8** Node tests + **76/76** preserved Python research tests + **9/9** Vitest tests = **93/93 PASS**; TypeScript `tsc -b`, Oxlint zero issues, Vite 8.3.4 production build PASS; all 35 Phase 1 research source hashes PASS. Final `PHASE 3 CONSOLIDATED LOCAL ACCEPTANCE: PASS` observed.
- **Source closeout:** exact 13-file source commit **`9b5a40a`** pushed to private GitHub `main`, final tracking worktree clean.

**Formal disposition: PHASE 3 COMPLETE / PASS (LOCAL IMPLEMENTATION, RECOVERY, SECURITY & SOURCE CONTROL).** No app production deployment, end-to-end scoring, browser authentication, Android share or pilot result was claimed or tested. No scoring decision changed. Do not re-run destructive `supabase db reset` or overwrite any of the five registered migrations.

## 30.3 Remaining active roadmap

| Phase | Major integrated deliverable | Status |
|---|---|---|
| **4 — Complete Competition Backend** | Trusted ingestion/parsing, five approved scoring policies, puzzle identity/review and server uniqueness, league/membership management, calendar/rolling season engine, snapshots/renewal/finalisation, moderation/corrections, per-game and combined standings | **NEXT / NOT STARTED** |
| **5 — Android-first PWA and competition experience** | React authenticated user experience, Android Share Target and paste fallback, results/rankings/history, moderation UX, mobile/accessibility/offline controls | PLANNED |
| **6 — Deployment, integrated assurance, pilot, release** | Managed Supabase + Cloudflare, executed CI, production controls, recovery/observability, five-game real player pilot, final reconciliation and release | PLANNED |

Scope boundary: Phase 4 may implement backend moderation/approval actions required for safe score processing. Full player-facing React moderation UI and Android PWA belong to Phase 5. Hosted environments and real pilot remain Phase 6. Owner-self-dispute resolution and unverified game date/mode semantics cannot be silently invented; use explicit safe review states and identify unresolved decisions before enabling awards.

## 30.4 Phase 4 implementation contract — accelerated workflow

**First substantive implementation response in the new Phase 4 chat:** inspect the **actual Git `main` source at `9b5a40a`**, then provide a **single comprehensive versioned ZIP/patch** (source, forward-only migrations, trusted functions/API code, automated tests, fixture and scoring provenance, scripts, docs). Keep `research/phase1-approved-local-poc/` and its 35 hashes unchanged, preserve the five owner-approved scoring versions and policies, and keep Phase 3's audit/migration history intact. No small-step code drip-feed unless essential prerequisite/security questions block responsible authoring.

Phase 4 must implement and end-to-end verify:

1. Server-authoritative, versioned parsers and deterministic scores for **Wordle, Minute Cryptic, FoxiMax, Polygonle and Krillion**, preserving exact share content and typed interpretation; unsupported identities/dates/modes held for review, not awarded speculatively.
2. Authenticated idempotent single result per account/game/puzzle, cross-league application, authoritative eligibility, review and pending-state behavior, 48-hour ordinary deadline, historical exceptions and auditable corrections. No client-side trust or early points.
3. Public/private league ownership and members, invitations/join/leave/rejoin, selective moderation permissions, eligibility from effective joining time and cross-league privacy.
4. Calendar/rolling seasons, frozen game/rule snapshots, scheduled next-season changes, automatic duplicate-safe renewal/finalisation, review overlap, per-game plus combined leaderboards and streak tracking separate from competition points.
5. One fail-fast, **non-destructive** apply pathway with backup and one **consolidated end-of-phase owner verification command**, exercising signed-in HTTP paths and negative permissions, all five games, duplicate/eligibility cases, historical/backdated and season boundaries, two-season renewal, audit integrity and existing regressions. Do not mark unexecuted tests PASS.

### Safe source transfer for the new Phase 4 chat

From the existing **Ubuntu** repository, use the actual HEAD (no reset/reinit required):

```bash
cd ~/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e
git status --short --branch
git rev-parse --short HEAD
git archive --format=zip \
  --output="$HOME/Desktop/Puzzle_League_Phase3_Complete_Commit_9b5a40a.zip" \
  HEAD
```

Inspect the archive for confidential files before uploading; do **not** upload database dumps, user tokens, `.env`, private messaging archives or Git SSH keys. The `git archive` command is **recommended but NOT YET REPORTED EXECUTED** and the transfer ZIP must not be claimed to exist until the user produces it. Attach this **v2.8 guide separately**, as it was generated after commit `9b5a40a` and is not claimed to be inside Git history.

### Copy-paste starter prompt — Phase 4 new chat

> Continue **Puzzle League** using authoritative `Puzzle_League_Project_Guide_v2.8_PHASE3_COMPLETE_PASS_PHASE4_START_2026-10-14.md` and the **actual source archive of Git commit `9b5a40a`** (or an authorised current repository connector). **Phase 0 COMPLETE; Phase 1 five-game local POC COMPLETE/PASS; Phase 2 local foundation COMPLETE/PASS; Phase 3 security/database/audit/recovery COMPLETE/PASS at local scope**, with five migrated SQL versions, real Auth/JWT/PostgREST policy tests, isolated ten-table app-schema restore, `npm run check` 93/93 PASS, and 13 files committed/pushed clean to private GitHub `main` as `9b5a40a`. Managed Supabase, hosted GitHub Actions, Cloudflare and live pilot remain unverified; no actual awarded game result or competition engine yet exists. Follow the accelerated workflow: **deliver Phase 4 Complete Competition Backend as ONE complete first-reply implementation package** after inspecting the real source, including trusted parsing and scoring for Wordle/Minute Cryptic/FoxiMax/Polygonle/Krillion; server-side duplicate and eligibility rules; public/private leagues, roles and invitations; calendar/rolling seasons with immutable snapshots, scheduled changes, automatic renewal/finalisation; moderation/historical corrections; game-specific and combined standings, all backed by tests. Preserve unchanged research, source history, five approved scoring formulas, 48-hour window and privacy controls. Provide safe non-destructive apply and ONE consolidated end-of-phase verification; do not start Phase 5 UI/PWA or Phase 6 deployment/pilot. Mark unexecuted VM tests NOT TESTED.

**No extra Phase 3 action is required to begin Phase 4.** The next chat should use the new source archive, not the earlier `1e9f216` ZIP.


---

# 31. ACTIVE PACKAGE CHECKPOINT — PHASE 4 PREPARED / OWNER ACCEPTANCE OPEN (2026-10-14)

**Scope:** This appended checkpoint is authored against the actual supplied `git archive` with embedded Git SHA `9b5a40a56b4f4cf3ad71f765fc913e3e94ed02d4` and five Phase 3 migrations. **It does NOT supersede §30's confirmed Phase 3 local PASS**; it supersedes only its `Phase 4 NOT STARTED` planning statement by documenting a prepared implementation artifact. No Phase 4 migration, SQL/HTTP security test, automatic maintenance job, owner commit or GitHub push is yet verified. Phase 4 remains **PREPARED / NOT TESTED on the owner VM**.

The first Phase 4 package, `Puzzle_League_Phase4_Complete_Backend_PREPARED_from_9b5a40a_2026-10-14.zip`, contains additive migrations `20261015100000`, `20261015100100`, and `20261015100200`; a five-game JavaScript parser port and authenticated Supabase Edge function; trusted server RPCs for league creation, public/private invitation membership, owner removal/suspension and reports, review queues, profile nicknames, calendar/rolling season snapshots, scheduled changes, idempotent rollover/finalisation, safe result ingestion and award allocations, late/historic exception approval, per-league corrections, separate game/combined rankings and streak reporting; SQL, real-JWT HTTP, source and sample tests; installer, private pre-migration backup, fail-fast application and one consolidated local verification runner. Only `supabase/config.toml` is intentionally modified (adds the competition-function JWT gate configuration); no research or applied SQL migration is overwritten.

**Author-side evidence:** a first local six-test Node parser regression passed against all 258 pseudonymised five-game fixture records, selected six-guess scoring tables and known edge conditions. Shell/Python syntax checks passed. **Not observed:** SQL migration application, SQL transaction correctness, real local Auth/Edge RPC paths, actual pg_cron registration, HTTP test fixture cleanup, VM backup/restore replay for the new tables, full current `npm run check` and a new Git commit. The existing Supabase/PostgreSQL service is not available inside the authoring sandbox. Treat any apparent verified SQL or HTTP behavior in the source as a design claim awaiting actual runtime acceptance.

**Trust guardrails:** Share text cannot itself independently certify date or daily mode. The production-bound parsers preserve candidate keys and return review states; an operator-only puzzle identity certification requires documented external evidence. The original +1 participation and five approved performance mappings remain unchanged. Pending/ambiguous results earn no points. Membership starts from the effective joining date; points use time-zone-aware puzzle dates and the 48-hour submission window. Competition-authorised corrections are per-league, preserving prior raw source. Reviewer must be independent of submitter/requester. Public standings intentionally exclude email/user login UUID. `pg_cron` automation must be registered for local automatic maintenance acceptance.

**NEXT OWNER ACTION — ONE PHASE PACKAGE:** Extract ZIP outside the current Ubuntu Git repository, follow `docs/PHASE4_COMPETITION_BACKEND_RUNBOOK.md`, and run `bash scripts/phase4/apply.sh`, then **one** `bash scripts/phase4/verify.sh`. If any check fails, keep Phase 4 OPEN; do not reset the local DB or commit. On actual consolidated PASS, stage/review only Phase 4 source and the one intended Supabase configuration edit, commit/push normally, record actual SHA and clean tracking status. The authoritative next checkpoint can then be upgraded to Phase 4 COMPLETE/PASS with exact owner-provided evidence and a Phase 5 handover. No production-hosted validation or pilot is implied.
