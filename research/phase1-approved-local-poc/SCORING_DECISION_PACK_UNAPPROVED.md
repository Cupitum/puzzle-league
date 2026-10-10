> **HISTORICAL DECISION PACK, SUPERSEDED ON 2026-10-10:** The user approved all five recommendations. Current authoritative scoring is in `SCORING_RULES_APPROVED.md` and `scoring.py`. The original below is preserved as pre-approval evidence.

# Puzzle League Phase 1, Block 3 — Scoring decision pack

**10 October 2026 | OWNER APPROVAL REQUIRED | Steps 7–9**

This document presents **recommendations**, not product approvals. The existing approved Wordle table, the previous *provisional* Minute Cryptic method, the five-game catalogue, 48-hour window, participation +1, streaks separate, and season freeze remain unchanged until the owner explicitly approves amendments. `scoring_candidates.py` is intentionally a **what-if preview** separate from `scoring.py` and can neither award league points nor determine submission eligibility.

## A. Recommended policy choices

| Game | Recommendation (performance only, 0–10) | Example performance +1 participation | Conditions/limitations |
|---|---|---|---|
| Wordle | **EXISTING APPROVED** 1/6→10; 2/6→8; 3/6→6; 4/6→4; 5/6→2; 6/6→1; X/6→0 | 4/6 → 5 total; X/6 → 1 total | No change requested |
| Minute Cryptic | **CANDIDATE** `max(0, 10 − hints_used)`; par difference descriptive only | 0 hints→11; 1 hint→10; 6 hints→5; 12 hints→1 | **Replaces previous provisional double-counting formula ONLY IF APPROVED**; formatted share indicates hints; disregard elapsed time as scoring input |
| FoxiMax (original daily `N/8`) | **CANDIDATE** 1→10; 2→9; 3→7; 4→6; 5→5; 6→4; 7→2; 8→1; X→0 | 5/8→6; 8/8→2; X/8→1 | `letters` diagnostic only. Daily original only; exclude /6, /7 and training unless separately approved. Mode/date cannot independently be authenticated by raw share |
| Polygonle | **CANDIDATE** use Wordle performance table for 1–6 and 😔/6→0 | 3/6→7; 😔/6→1 | Regular daily 6–8-letter puzzles only. No bonus for hard/expert/hexpert, no length adjustment. Do not count mini/custom/unlimited; original share may not prove mode |
| Krillion (daily dive) | **CANDIDATE** `min(10, floor((reported_score + 35) / 70))` on 0–700; nearest whole point, half up | 60→2; 185→4; 440→7; 700→11 | 700 possible according to publisher, 7 prompts/day; score must be 0–700. Emoji symbols not used. Daily only; share cannot independently prove mode/date |

**Reasoning:** Fixed/absolute results are immediately reproducible and can be frozen per season; ranked results would need cohort-size rules, tiebreak/normalisation, late submissions and finalisation handling. Every accepted *completed* eligible share adds +1 participation, even a recorded failure, but no points are **actually awarded** in this prototype. Raw shares are not authentication.

## B. Minute Cryptic double-count evidence

From the pseudonymised imported chat:

| Shared puzzle date | Sample A | Sample B | Derived par (`hints + signed_under`) |
|---|---|---|---|
| 2026-08-27 | 5 hints, 3 over | 1 hint, 1 under | 2 in both shares |
| 2026-09-04 | 7 hints, 3 over | 12 hints, 8 over | 4 in both shares |
| 2026-10-05 | 1 hint, matched | 2 hints, 1 over | 1 in both shares |

Therefore, the par comparison is substantially determined by `hints_used` and the puzzle's community par; the old `10 − hints + signed_under` penalises hints twice. Across 33 samples, candidate hint-only averages **6.85** performance (old provisional averages **6.30**). Community par could change with incoming solvers; keeping it informational simplifies auditing. This is evidence-based reasoning, **not** a statement from the publisher explicitly defining the statistic.

An alternative would be difficulty-normalised `clamp(7 + signed_under,0,10)` for example; however, a shifting community par may affect scores and normalisation needs separate approval. The simplest deterministic choice is hints-only.

## C. Game mechanisms verified from official publishers

- FoxiMax: A missed letter adds another word. Fewer words is better. A game can reach eight words; misses in a failed game reveal red tiles. Daily and training modes exist; variants FoxiMax 6/7 exist. [FoxiMax about](https://foximax.com/about.html) and [FoxiMax game](https://foximax.com/).
- Polygonle: The daily puzzle has 6–8 letters, six guesses, and resets at local midnight; mini, custom, unlimited, archive and hard/expert/hexpert modes exist. [Polygonle tips](https://www.polygonle.com/tips).
- Krillion: Seven daily prompts of 25 seconds each; rarity contributes to score; 700 is described as the trench/max level, ten metres per point, and one daily dive. [Krillion](https://krillion.io/) and [FAQ](https://krillion.io/faq).

The publisher descriptions **do not** approve how an independent Puzzle League converts game results into its performance points.

## D. Observed distribution — what-if totals ONLY

These values are averages over **submitted** archived results, not the whole population, not controlled for player skill, and not proof of equal difficulty. They are descriptive rather than league forecasts.

| Game | Sample count | Mean performance (candidate) | Mean total (+1) |
|---|---:|---:|---:|
| Wordle (approved reference) | 116 | 2.92 | 3.92 |
| Minute Cryptic | 33 | 6.85 | 7.85 |
| FoxiMax | 70 | 3.44 | 4.44 |
| Polygonle | 18 | 5.78 | 6.78 |
| Krillion | 21 | 2.76 | 3.76 |

**Fairness consideration:** The same 0–10 range does *not* mean the same typical points. Minute Cryptic and Polygonle trend higher here than Wordle/Krillion. League owners already select games for a frozen season; user must decide whether this imbalance is acceptable. Do not reweight without approval. A ranked Krillion approach could equalise per-puzzle relative standing but introduces variable provisional points and small-sample artifacts.

## E. Precisely outstanding owner decisions

1. **Minute Cryptic:** Replace the previously agreed *provisional* double-counting formula with **10 − hints (clamped)**, par as separate information? (Recommended YES.)
2. **FoxiMax:** Adopt **10,9,7,6,5,4,2,1** for 1–8 completed words; X→0, `letters` ignored? (Recommended YES; original daily only.)
3. **Polygonle:** Adopt **Wordle 1–6 table**, loss→0; ignore length/mode bonuses, intended only for daily 6–8 letter puzzles? (Recommended YES; implement review gates for unverified modes.)
4. **Krillion:** Adopt **absolute scale 0–700 → rounded performance 0–10** instead of competition-ranked points? (Recommended YES; daily dive only.)
5. **Cross-game distribution:** Accept for the first pilot that equal *maximum* possible points does not imply equal expected or typical performance across games? (Recommended YES, monitor pilot data without mid-season rescoring.)

Until owner approval, **none** of items 1–5 are DECIDED. Do not assume that 'proceed' explicitly ratifies individual scoring choices; it authorises this decision/verification block.

## F. Evidence, steps and gate

- Phase 1 Block 3 Step 7: Evidence review and specific owner choices prepared — **PROPOSALS PREPARED / OWNER APPROVAL PENDING**.
- Step 8: `scoring_candidates.py` contains *unapproved what-if implementations*, with isolated regression tests; **APPROVED scoring versions NOT IMPLEMENTED** for these four. No write path or backend.
- Step 9: Parser/identity gate **OPEN**; there are still unverified game dates for number-only puzzles, mode ambiguity, lack of external authenticity, and no server uniqueness. These later-phase system requirements cannot be declared complete in Phase 1.
- Test command from project folder: `python -m unittest discover -v` — **52/52 PASS** on 2026-10-10 (37 preserved tests +15 candidate-only tests).
- Raw private source group chat is **not** included in the research distribution; tested fixtures are pseudonymised.

**Requested user response:** "Approve all five recommendations" or specify changes for any numbered item. Only then can the authorised score version module be updated and tested as approved for Phase 1 Steps 8–9.
