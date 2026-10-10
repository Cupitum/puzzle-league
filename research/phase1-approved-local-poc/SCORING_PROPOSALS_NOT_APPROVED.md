> **HISTORICAL PROPOSALS, SUPERSEDED ON 2026-10-10:** See current `SCORING_RULES_APPROVED.md`. Content below documents the earlier pre-approval state.

# Phase 1 Block 2 — five-game scoring review (NOT AN APPROVAL)

**Date:** 2026-10-10. **Source hierarchy:** user-supplied share examples are observations; official game help pages are descriptions of game mechanics; neither automatically authorises a Puzzle League scoring policy.

## Already approved or provisionally agreed

- **Wordle**: approved fixed performance for 1/6..6/6 = `10, 8, 6, 4, 2, 1`; completed X/6 = 0 performance; add +1 for an accepted completed result; no result = 0. Implemented as `wordle-fixed-v1-approved` in `scoring.py`. Values are local previews, **not awarded**.
- **Minute Cryptic**: old planning formula `clamp(10 - hints_used + signed_under_par_difference, 0, 10)`, +1 participation, implemented only as `minute-cryptic-formula-v0-provisional`. Newly observed share: Sep 6 2026, 6 hints, 3 **over** par, time 34m 19s, 🏋️. Example produces provisional performance 1 and total 2. Previous Oct 7 share, 1 hint, 1 **under** par, produces provisional performance 10 and total 11. Community-par difference may be calculated from hints, causing double-reward/double-penalty; game authors' par semantics and hint classifications remain unresolved. **Do not activate formula without review.** Alternatives for owner decision: `10-hints` only, or `10+signed_under_par_difference` only, each clamped; neither alternative approved.

## Three new initial-release games — candidate rules, NO scored implementation

### FoxiMax

- **Observed:** `🦊#FoxiMax #1502 7/8 (19 letters)`, `#1502 8/8 (20 letters)`, `#1505 5/8 (16 letters)`; five tiles per displayed row; row count equals numerator on three samples. Structural parser retains `fraction_numerator`, `fraction_denominator`, `letter_count_displayed`, emoji grid and ID. Does not assume numerator is a Wordle-style *guess count*.
- **Publisher description:** Hangman-style letter reveals, each missed letter introduces another word, and **fewer words is better**; game can go up to eight words. Official: https://foximax.com/about.html
- **PROPOSAL, NOT DECIDED:** use a decreasing 0–10 performance table keyed to the displayed `N/8` metric, with 0 for a confirmed unsuccessful run, and +1 for completed participation. Exact mapping (and whether `8/8` can be a completed win) needs user approval and an actual failed-result example. Discuss whether `(letters)` is score-affecting or diagnostic only; no formula assumed.

### Polygonle

- **Observed:** puzzle 1529 with 3/6 success and 😔/6 failure; eight-position grid in these examples; pattern glyph line; optional streak trailer. Parsed loss row count = six; 3/6 last row all green. Streak stored separately.
- **Publisher description:** solve word in six tries; word lengths differ by puzzle/mode; some difficulty modes change guess constraints. Official: https://www.polygonle.com/tips
- **PROPOSAL, NOT DECIDED:** perhaps reuse Wordle's existing fixed 1–6 mapping and failure rule, +1 participation for completed attempts. Need owner decision on how standard/hard/expert/hexpert modes affect fairness, and whether the result format exposes mode. Real non-eight-word samples remain unverified (parser supports structurally 5–8 pending real fixtures).

### Krillion

- **Observed:** daily `Krillion #84 🦐`, reported numbers `90` and `440`, followed by seven symbols. Typed parser preserves number and raw symbols but does not interpret them as rank/tier or award points.
- **Publisher description:** seven prompts per daily dive, rarer valid answers score higher, 700 possible points (each point corresponds to 10 m of depth). Official: https://krillion.io/ ; see also https://krillion.io/faq
- **PROPOSAL A, NOT DECIDED:** direct 0–700 score normalised to 0–10 performance, e.g. `clamp(reported_number / 70, 0, 10)`, but decimal precision and rounding must be chosen. **PROPOSAL B:** daily competition-ranked normalisation (ties follow agreed `1,1,1,4` convention); rank formula, sample-size effects and freeze must be agreed. +1 participation only after completed daily result accepted. Confirm whether seven-symbol row reliably shows seven completed prompts and whether score range remains invariant across modes.

## Non-negotiable gate

All three proposals are **unapproved**. Do not silently turn sample metrics into league points. `needs_review` typed results remain `scoring_eligible = false`. League scoring requires scoring policy version snapshot, account/league eligibility, 48-hour rule, authenticated dedupe and audit; these are later-phase work.

---

## Evidence addendum from larger WhatsApp export (2026-10-10; still NOT APPROVED)

- **FoxiMax:** 70 observed shares, including **4 genuine reported `X/8`** failures and 11 numeric `8/8` shares. The loss samples contain red 🟥 tiles; a displayed `X/8` is not equivalent to completing the eighth row successfully. Observed numeric successes span `1/8`, `3/8`, `4/8`, `5/8`, `6/8`, `7/8`, and `8/8`. With this stronger evidence, propose an explicitly decreasing fixed performance schedule for successful `N/8` and performance 0 for `X/8` only if the owner approves this interpretation. Letters count remains diagnostic unless explicitly approved otherwise. No FoxiMax points calculated or awarded.
- **Polygonle:** 18 observed samples: word lengths of 7 or 8, one `😔/6` failure, the rest wins. Need decide whether guesses-based performance stays the same between puzzle lengths, and confirm handling for future difficulty modes. No points calculated or awarded.
- **Krillion:** 21 samples, numeric values 60–440. They do not establish a performance normalisation standard or precise emoji semantics. Choose absolute-scaled or per-puzzle ranked performance based on approved competition policy and actual mechanics; no points calculated or awarded.
- **Minute Cryptic:** 33 actual shares; 0–12 hints and displayed under/over-par differences −8..+2. This strengthens the case for reviewing potential overlap between hints and community par before freezing the scoring version. The existing provisional preview has NOT become an approved production rule.
- **Wordle:** Four real X/6 failures now confirm the already approved fixed table's failure category. All Wordle score values are previews, not awards.
