# Puzzle League — Android session and league-owner acceptance checklist

**Status:** revised for dedicated first-season and league-management screens. Current repair is prepared, NOT YET owner/build/device verified. Source baseline: Phase 4 commit `47ea0df` plus locally installed Phase 5 repairs. Use the existing Ubuntu repository `~/Desktop/Development/Puzzle_League`. Do not reset Supabase or seed fabricated official puzzle dates. Tests using real game shares can legitimately end in **pending review** rather than points.

## Product model: league ≠ season

- **Create league** names a persistent community and sets visibility (public/private) and an IANA time zone. The backend sets `leagues.owner_user_id` to the authenticated creator. It does **not** automatically create a season or choose games. The owner can appear under **My leagues** without a second league-membership row. This is intentional; the league's creation date is the owner's score eligibility boundary.
- **Start first season**, owner-only: choose schedule (**calendar week, calendar month, rolling days**) and any **nonempty subset** of the five supported games (Wordle, Minute Cryptic, FoxiMax, Polygonle, Krillion). The backend freezes those games and their approved scoring versions for that season.
- **Next seasons** renew automatically; to change games the owner uses **Schedule a future season change**. It cannot rewrite an already-started season. Default future selections copy the latest approved configuration. Leagues are persistent across seasons.
- **Membership**: users join a public league or accept a private single-use invitation. A result is submitted once per account/game/puzzle, then considered for each eligible league, with joining date, verified daily identity/mode, season window and review rules independently applied. Late results outside the 48-hour ordinary window require approval. No points are awarded merely from parsing an unverified share.
- **Ownership/moderation**: owner manages seasons, invitations, moderators and delegations. A moderator title alone grants neither review authority nor roster visibility. Independent approval is required for disputes; a requester cannot approve their own pending request.

## Test conditions

Use **two disposable local Auth accounts** on the development backend, `Owner A` and `Player B`. Prefer one installed Android PWA plus a separate browser/device for Player B. Test only your own game shares. Do not upload public account keys, Auth sessions, invitation tokens, member email addresses or private user data in test reports. Record PASS / FAIL / NOT TESTED and a brief symptom for each step. Real results may be held for review until an operator independently verifies official date and daily mode.

| # | Who / where | Action and navigation path | Expected proof | Result |
|---|---|---|---|---|
| 1 | A, Android installed app | **Account → Sign in**, then **Submit → Leagues → Rankings → Account** | One sign-in is retained throughout; same public nickname/email in Account; no new login prompt | ☐ |
| 2 | A, Android installed app | Close/reopen the installed PWA; return to **Account** | Session remains signed in; no new login | ☐ |
| 3 | A, Wordle site/app → Share | Share to **Puzzle League** while signed in; review draft | Result arrives intact; user stays signed in; no automatic submit | ☐ |
| 4 | A, Submit | Tick acknowledgement → **Confirm and submit** | Server receipt; accepted, duplicate-safe, or pending-review; no invented client score | ☐ |
| 5 | A, Leagues | **Create a league**: name `Puzzle League UAT`, private, chosen IANA zone | Automatically navigates to dedicated **Set up your first season** screen at the top; **Owner** badge, schedule and game selector are visible without scrolling the leagues directory or joining again | ☐ |
| 6 | A, Leagues → opened league | Choose **calendar month**, select only **Wordle + Minute Cryptic**, **Start season** | Automatically opens dedicated league-management view; Season 1 appears with exactly two games; other games excluded from league scoring | ☐ |
| 7 | A, Leagues → opened league | **Create invitation**, copy securely | One-use invitation and expiry displayed; league remains private from outsiders | ☐ |
| 8 | B, Account → Leagues | Sign in as B, join using invitation token | Joined league appears under My leagues; B shows **Member**, not Owner | ☐ |
| 9 | B, Leagues → opened league | View season and selected games; attempt owner-only controls | Can see authorised private league/season; cannot start/schedule season or create owner invitation | ☐ |
| 10 | A, Leagues → opened league | Choose Wordle + Minute Cryptic + Krillion; **Schedule selected games** | Server schedules for a **future** season; current season still shows the original two games | ☐ |
| 11 | B, Submit | Submit one own complete result; try exact same result again | Each distinct puzzle can be globally submitted once; repeat is duplicate/no additional awards; review safety remains intact | ☐ |
| 12 | A/B, Rankings | Select correct league season; view combined, per-game and streak views | Only eligible confirmed awards appear; absent/unverified shares do not create early points; private league restricted to members/owner | ☐ |
| 13 | A, Moderation | Select league, **Load visible members**, try moderator / roster delegations for B | Owner can see roster and manage role; B cannot grant privileges to self | ☐ |
| 14 | A/B, Moderation | File a report or correction and load authorised queue | Pending request is private; person who filed cannot approve their own case; delegated reviewer needs explicit permission | ☐ |
| 15 | A, Account | Sign out; reopen app and return to Submit | Signed out across PWA windows; existing draft not auto-submitted; re-authentication required for writes | ☐ |
| 16 | B, private league access | Verify outsider cannot see private leagues/standings; optional remove/rejoin with consent | RLS/Edge denies unauthorised view and writes; rejoin doesn't revive older eligibility or duplicate scoring | ☐ |

**Manual review acceptance:** Tests 1–6 and 15 are core to the session/league-owner repair; 7–14 and 16 form the broader Phase 5 competition UX signoff. HTTPS-origin installed share testing, accessibility/usability review, hosted CI and Phase 6 staging/deployment remain separate gates. A localhost USB-forwarded Android pass does not prove public HTTPS deployment.

## Suggested owner test path

1. Start Vite and keep working ADB reverse forwarding for `5173` (UI) and `54321` (local Supabase).
2. **Account (A) → Submit → Wordle Share → Account**: confirm session persists. Test a full app relaunch.
3. **Leagues → Create → dedicated Set up first season → Start first season → dedicated league management**. Check there is no directory scrolling to reach the form; Owner label remains visible.
4. **Private invitation → Account (B) → Join → Rankings**. Check owner vs member permissions.
5. **Future game change → Moderation → Sign out → reopen**. Confirm no privilege leakage.

**Reporting:** Send only the checklist item numbers with PASS/FAIL/NOT TESTED plus redacted screenshots/error text for failures. Never paste `.env.local`, Auth tokens, invitation tokens or service-role keys. Do not claim an accepted league score without a verified daily puzzle and the backend award receipt.

**New navigation regression (2026-10-17):** Re-open an existing owner league without a season via **Leagues → My leagues → Open**; this must go straight to the dedicated setup view. An existing league with a season must go to its dedicated management view. The Leagues navigation item stays highlighted in both views; Back returns to the leagues directory. A guest/nonowner must never receive an owner-only first-season control.
