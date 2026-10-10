# Puzzle League — Phase 1 approved scoring contract

**Decision date:** 2026-10-10. **Authority:** User explicitly replied **“agreed with all”** to the five-item scoring recommendation (four new/revised games and fairness acceptance). **Status: DECIDED**; implementation is a local **preview-only** proof of concept, not a backend award service.

## Game-specific performance points

| Game | Rule version | Approved performance | Completed failure |
|---|---|---|---|
| Wordle | `wordle-fixed-v1-approved` | 1/6→10; 2/6→8; 3/6→6; 4/6→4; 5/6→2; 6/6→1 | X/6→0 |
| Minute Cryptic | `minute-cryptic-hints-v1-approved` | `max(0, 10 − hints_used)` (10 upper bound automatically for hints >=0) | Only observed completed solved shares are covered; unrecognised/failed format requires review |
| FoxiMax | `foximax-original-n8-v1-approved` | Original daily 1/8→10; 2/8→9; 3/8→7; 4/8→6; 5/8→5; 6/8→4; 7/8→2; 8/8→1 | X/8→0 |
| Polygonle | `polygonle-standard-v1-approved` | Standard daily 6–8-letter puzzles, six guesses; same successful attempt table as Wordle | 😔/6→0 |
| Krillion | `krillion-daily-absolute700-v1-approved` | Daily score 0–700: `min(10, floor((reported_score + 35) / 70))`, round halves up | No separately observed fail flag; submitted completed daily dive receives 0–10 |

**Common rules:** +1 participation for each *accepted, completed, eligible* result, including supported completed failures; skipped/not submitted = 0; streaks are separate; a result is captured once per authenticated user/game/puzzle and can count in eligible leagues; combined scoring sums eligible game totals. Freeze these rule versions per season and audit later changes.

**Non-scoring share fields:** Minute Cryptic community par, time and clue; FoxiMax letter count; Polygonle word length (within approved 6–8) and difficulty badge; Krillion seven-symbol trail. No mode, difficulty or clue bonuses are approved.

**Owner explicitly accepted sample-average differences for initial pilot:** The five games have the same maximum point opportunity (11 for accepted completed share), but the observed sample means are different. No normalisation by historical means, per-player league sizes or reweighting during a season is approved. Ranked approach remains a later, unactivated framework for other suitable games.

## Acceptance and enforcement boundaries (not resolved by rule approval)

1. `scoring.py` calculates **versioned previews only**. Its return values explicitly say `awarded:false`, `result_accepted:false`, `requires_eligibility_and_authentication:true`.
2. The parser continues to return `scoring_eligible:false` for ALL results. FoxiMax, Polygonle and Krillion remain `needs_review` because the actual daily mode/date cannot be verified from observed share text. Even a computed preview MUST NOT turn them into awarded points.
3. Authenticated account identity, server-side `(account,game,puzzle)` uniqueness, membership effective date, late 48-hour window, moderation approval and frozen season score config are for later phases.
4. Puzzle number must not be silently converted to a puzzle date. WhatsApp timestamps are transport metadata, not puzzle dates. Original raw text must remain auditable on future ingestion.
5. Wordle with extra non-share text is `needs_review` and cannot be auto-previewed as a plain valid share; missing/unsupported formats remain invalid/ambiguous or pending moderation.
6. Do not claim current five-game live pilot readiness. Phase 1 is a **local parser/scoring POC**; all later API/identity/app/Android gates remain to be built/tested.

## Historic policy superseded by owner decision

The previous Minute Cryptic `clamp(10 − hints + signed_under_par, 0, 10)` was *provisional*, never used for actual league awards, and is now **SUPERSEDED**. `scoring_v0_historical.py`, `scoring_candidates.py` and the archived `SCORING_DECISION_PACK_UNAPPROVED.md` are historical snapshots, not current policy. Do not import either historical module into production scoring.

**Krillion examples:** raw 0→total 1; 35→2; 60→2; 185→4; 440→7; 700→11. Performance 440→6, plus participation = **7 total**, not 7 performance.
