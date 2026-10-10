# Puzzle League — Authoritative Project Guide & Phase Tracker

**Version:** 1.8 / Phase 1 local POC PASS; Phase 2 Block 1 scaffold PREPARED, user-local verification OPEN  
**Last updated:** 10 October 2026  
**Current checkpoint:** Phase 0 COMPLETE. **Phase 1 COMPLETE / PASS at local POC scope** (76/76 Python regressions re-run 2026-10-10). **Phase 2 Block 1 / Steps 1–3 IN PROGRESS**: compatible frontend/backend/hosting architecture researched and PROPOSED (not owner-approved), TypeScript/Vite starter folder created in the sandbox, 35/35 approved POC file hashes retained, 4/4 zero-dependency Node scaffold tests PASS. The user’s developer PC has NOT been inspected, npm registry was unavailable in this sandbox, and install/lint/typecheck/Vitest/build/browser start are **NOT TESTED**. No real app, backend, cloud account, database, season engine or Android share tested. **NEXT: run Windows local verification inside this same Block 1 and confirm stack decision before passing it**. §20 is the active handover.
**Purpose:** This document is the authoritative handover guide for the Puzzle League application. Upload the *latest updated copy* in each new phase chat. It preserves the approved product rules, technical assumptions, implementation evidence, open questions, phase progress and next-chat instructions. This file adapts the process and tracking conventions from the user's Police Docket Database project guide; its docket-specific content, schemas and historical results do **not** apply to Puzzle League.

> **Evidence convention:** An approved requirement is not the same as a working feature. A standalone local Python parser prototype and unit tests now exist; no repository, backend, database, deployed PWA or Android test is verified. Samples are user-supplied share excerpts, not independently authenticated. Never mark an implementation step COMPLETE merely because the requirements were agreed.

---

# 1. PROJECT CONTROL RULES

1. This latest guide is the project source of truth when supplied in a new conversation. Preserve explicit agreed rules; note any requested changes in the decision log.
2. Work in **short, bounded phases and chats**. Start each chat with the exact phase/block/step scope; avoid drifting into future features.
3. **One small implementation action at a time** where practical. Provide exact commands or code, ask for actual output, validate, then proceed. For longer independent tasks, group into no more than three verifiable steps per chat/block.
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

# 6. PROPOSED TECHNICAL ARCHITECTURE (NOT YET INSTALLED)

**Frontend candidate:** React + TypeScript + Vite + PWA manifest/service worker.  
**Backend/data candidate:** Supabase Auth + PostgreSQL, Row Level Security, server-side functions for trusted writes/scoring.  
**Hosting candidates:** Cloudflare Pages or Vercel; selection/deployment NOT YET MADE.  
**Development candidates:** VS Code, Git, GitHub.  
**Targets:** Android installed PWA first; responsive web on desktop and iOS; copy/paste fallback for unsupported share-target environments.

**Do not treat this candidate stack as an installed or deployed fact.** Evaluate costs, current platform support, and device test outcomes before locking it.

### Candidate logical entities (not a verified schema)

`profiles`, `leagues`, `league_memberships`, `games`, `game_puzzles`, `result_submissions`, `parser_versions`, `scoring_rule_versions`, `league_seasons`, `season_game_settings`, `league_score_entries`, `approval_requests`, `approval_decisions`, `result_audit_events`, `scheduled_rule_changes`, `moderation_reports`.

**Integrity objectives:** Idempotent result ingestion and scoring; duplicate-safe automatic season renewal; immutable season rule snapshots; explicit membership eligibility; per-league permissions; proper foreign keys/unique constraints; versioned scoring; safe audit/reversal paths.

---

# 7. IMPLEMENTATION PHASE TRACKER — CHAT STRUCTURE

**Method:** Phase 0 is the agreed planning work. Each subsequent phase is split into 1–3 chats/blocks if needed, with **at most three numbered steps per chat**. Close each chat with objective evidence and an updated downloadable `.md` checkpoint. Start the next chat with the checkpoint. Do not claim a block complete without its exit criteria.

| Phase | Name | Planned chats/blocks | Status |
|---|---|---:|---|
| 0 | Product Definition & Requirements | Previous planning conversations | **COMPLETE (requirements baseline)** |
| 1 | Real Share Samples & Parser Proof of Concept | 3 chats × 3 steps (Block 3 explicitly authorised) | **COMPLETE / PASS — LOCAL POC ONLY, 76/76 tests** |
| 2 | App Architecture & Local Repository Foundation | 2 chats × 3 steps | **BLOCK 1 IN PROGRESS — sandbox scaffold prepared; user-local verification outstanding** |
| 3 | Database, Accounts & Security Foundation | 3 chats × 3 steps | PLANNED |
| 4 | Game Results API, Validation & Scoring | 3 chats × 3 steps | PLANNED |
| 5 | Leagues, Membership & Season Engine | 3 chats × 3 steps | PLANNED |
| 6 | PWA User Interface & Android Share Target | 3 chats × 3 steps | PLANNED |
| 7 | Moderation, Rankings, Audits & History | 3 chats × 3 steps | PLANNED |
| 8 | End-to-End Testing, Security & Deployment | 3 chats × 3 steps | PLANNED |
| 9 | Pilot Season, Stabilisation & MVP Release | 2 chats × 3 steps | PLANNED |

Phase counts and chat splits are planning targets. Changes require a recorded decision; never silently redefine a phase already underway.

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
**Status: BLOCK 1 IN PROGRESS (PREPARED, NOT PASS); see §20**
- Block 1 / Steps 1–3: Confirm selected stack and requirements; create repo; establish TypeScript/tooling/tests and standards.
- Block 2 / Steps 4–6: Organise packages/modules; formalise config/secrets; CI/static checks and developer instructions.
- **Exit:** Clean reproducible local start and test run documented.

## Phase 3 — Database, Accounts & Security Foundation
**Status: PLANNED**
- Block 1 / Steps 1–3: Initial migrations/data model; keys/constraints; validate schema.
- Block 2 / Steps 4–6: Auth/profile; Row Level Security; league/member permission primitives.
- Block 3 / Steps 7–9: Audits/approvals tables; security tests; recovery/migration checks.
- **Exit:** Verified migrations and server-enforced access control.

## Phase 4 — Game Results API, Validation & Scoring
**Status: PLANNED**
- Block 1 / Steps 1–3: Submission API; parser integration; immutable raw capture/versioning.
- Block 2 / Steps 4–6: Scoring rule versions; participation and per-game score engine; duplicate prevention.
- Block 3 / Steps 7–9: League allocation/eligibility; correction semantics; automated API tests.
- **Exit:** One result is scored exactly once per eligible league with reproducible tests.

## Phase 5 — Leagues, Membership & Season Engine
**Status: PLANNED**
- Block 1 / Steps 1–3: Public/private creation; invitation/join/leave; roles.
- Block 2 / Steps 4–6: Calendar/rolling seasons; frozen rule snapshots; scheduled modifications.
- Block 3 / Steps 7–9: Automatic renewal idempotency; late submission handling; season review/finalisation.
- **Exit:** Two or more simulated seasons run without data loss or duplicate creation.

## Phase 6 — PWA User Interface & Android Share Target
**Status: PLANNED**
- Block 1 / Steps 1–3: Mobile navigation/profile; leagues/game results screens; accessible UI.
- Block 2 / Steps 4–6: PWA manifest/install; Android share target; paste fallback and result preview.
- Block 3 / Steps 7–9: Real Android device tests; offline/failure handling; responsive polish.
- **Exit:** Actual Android Share → PWA → confirmed submission works on tested configuration; paste remains available.

## Phase 7 — Moderation, Rankings, Audits & History
**Status: PLANNED**
- Block 1 / Steps 1–3: Review queue and corrections; permission/audit checks; owner self-review safeguards.
- Block 2 / Steps 4–6: Per-game and combined standings; separate streak statistics; ranked scoring where fully defined.
- Block 3 / Steps 7–9: Historical imports; archived champions; public/private visibility and abuse controls.
- **Exit:** Pending result never scores early; authorised corrections are auditable; leaderboards reconcile.

## Phase 8 — End-to-End Testing, Security & Deployment
**Status: PLANNED**
- Block 1 / Steps 1–3: Integration/security/abuse tests; backup/restore plan; accessibility/browser checks.
- Block 2 / Steps 4–6: Production hosting/config/secrets; domain/HTTPS; deployment migration tests.
- Block 3 / Steps 7–9: Recovery and monitoring; release checklist; production-readiness gate.
- **Exit:** Stable deployment with validated security, backups and share fallback.

## Phase 9 — Pilot Season, Stabilisation & MVP Release
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

---

# 9. OPEN ITEMS & VALIDATION RISKS — UPDATED 2026-10-10

**Resolved at Phase 1 local POC:** observed Wordle X/6 losses; several Minute Cryptic hint/par variants; FoxiMax X/8 and red tiles; Polygonle standard wins/failures and 7–8-letter samples; Krillion reported values 0–700 handling; all five score rules and pilot cross-game average differences **APPROVED**, 76/76 local tests PASS.

**Still NOT VERIFIED (do not silently convert to implementation):**
- External authenticity of any user-shared text, real account ownership or sender authentication.
- Daily puzzle date/number mapping and cross-timezone calendar rules. Wordle, FoxiMax, Polygonle and Krillion samples present numbered identities with missing verified dates. WhatsApp timestamps must never stand in for puzzle dates. Minute Cryptic dates are self-reported within share text, not independently verified.
- FoxiMax original daily vs training/variant; Polygonle daily vs unlimited/custom/modes and unsupported mini; Krillion daily vs other mode. The observed share alone cannot prove the intended mode. Extra games remain `needs_review`; score previews are NOT acceptance.
- Unseen future share variants (especially 6-letter Polygonle, additional Minute Cryptic outcome icons or failed-result format, Krillion symbol semantics). Unknown formats remain review-only, no points.
- Backend authentication, server-side uniqueness, eligibility by membership date, 48-hour late submissions, moderator controls, season rule snapshots and reliable audit and correction semantics.
- Actual Android installed PWA Share Target and paste fallback, hosting/HTTPS, deployed site, platform compatibility and security.
- Exact custom/rolling-month season boundaries; historical exceptions and owner self-approval exception; finalisation corrections.
- Current technical costs and choice of repository/frontend/backend/hosting tools (Phase 2). Ranked scoring normalisation reserved for later eligible ranked games; not used for these five fixed/absolute policies.

**Pilot gate:** Still NOT READY. Local parser/scoring POC PASS is NOT a live acceptance gate. The later project phases must validate integration before any actual member points are awarded.

---

# 10. CURRENT VERIFIED IMPLEMENTATION STATE — UPDATED 2026-10-10

| Component | State |
|---|---|
| Product requirements | Phase 0 baseline agreed, plus five-game scope and approved scoring |
| Latest guide | v1.8, dated 2026-10-10; new §20 supersedes the prior next-action handover |
| 258 pseudonymised WordleGroup shares | Wordle 116; Minute Cryptic 33; FoxiMax 70; Polygonle 18; Krillion 21; from 432-message WhatsApp export; NOT independently authenticated |
| Additional older anonymised sample fixtures | Preserved for regression, not summed into 258 without proven distinctness |
| Parser | Python `parser.py` **0.4.0-poc**, typed observed formats, safe status handling, no server input trust |
| Approved performance scoring | Python `scoring.py` with five **v1-approved** rule versions, preview only |
| Historical policy/candidates | `scoring_v0_historical.py` and `scoring_candidates.py` preserved, inactive |
| Test suite | **76/76 PASS**, no failures; 52 inherited/current historical + 24 new approved-rule tests |
| Full five-game POC score preview | 258/258 structurally typed corpus results tested, 0 accepted, 0 awarded; 109 FoxiMax/Polygonle/Krillion review-only |
| Puzzle identity | Candidate key extraction tested; actual date/mode verification and backend deduplication NOT IMPLEMENTED |
| Git repository/local app structure | Fresh sandbox scaffold and Git init verified in Phase 2 Block 1; **user PC/remote still NOT VERIFIED** |
| Backend/database/auth | NOT STARTED |
| League/season engine | NOT STARTED |
| Frontend/PWA/Android Share | Basic React/Vite placeholder **source prepared only**; dependency installation, running web UI, PWA/Android Share **NOT TESTED** |
| Hosting/deployment | NONE VERIFIED |
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

# 12. NEW-CHAT HANDOVER PROCEDURE

1. End a chat after the scoped 1–3 steps are verified (or explicitly BLOCKED).
2. Update this guide with actual code paths, commands, versions, tests, observed results, open risks, and next step.
3. Save a new dated copy, e.g. `Puzzle_League_Project_Guide_PHASE1_BLOCK1_COMPLETE_PHASE1_BLOCK2_START_YYYY-MM-DD.md`.
4. In a **new chat**, upload that latest `.md` file along with any real sample fixtures/code the next phase needs. The guide alone does not contain executable source files.
5. Paste the starter prompt below and stay strictly within its declared scope.

### ARCHIVED STARTER PROMPT — FIRST IMPLEMENTATION CHAT (SUPERSEDED: USE §15 INSTEAD)

> We are continuing the **Puzzle League** app project. I have uploaded the authoritative file `Puzzle_League_Project_Guide_REQUIREMENTS_COMPLETE_PHASE1_START_2026-10-10.md`. Read and follow it as the authoritative checkpoint. Phase 0 (product requirements) is COMPLETE; implementation has NOT STARTED. Start **Phase 1 — Real Share Samples & Parser Proof of Concept, Block 1 / Steps 1–3 ONLY**. Step 1: inspect authentic Wordle and Minute Cryptic share samples (ask me to paste real samples if not attached; do not invent them). Step 2: agree a typed parser contract and error/approval states. Step 3: build a minimal local parser and show reproducible tests against the verified samples. Do not start the database, account system, PWA or unrelated phases. Work in small verifiable steps. At the end, update the guide with actual results and provide a newly dated `.md` checkpoint for the next chat.

---

# 13. IMMEDIATE NEXT ACTION

**CURRENT AS OF v1.8: Phase 1 local POC PASS; Phase 2 / Block 1 / Steps 1–3 IN PROGRESS. §20 gives the active instructions to verify the prepared project on the user’s computer.** The older paragraph below is historical context from an earlier checkpoint, superseded by §19.

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

# 20. ACTIVE CHECKPOINT — PHASE 2 BLOCK 1 / STEPS 1–3 PREPARED (2026-10-10)

**Status: IN PROGRESS — local foundation packaged; Block 1 acceptance NOT PASSED.** The user uploaded the authoritative v1.7 guide and Phase 1 Block 3 approved POC ZIP to begin the next project stage. This is a continuation in the bounded Phase 2 Block 1 scope, not authorisation to start Phase 3.

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
