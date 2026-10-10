# Puzzle League — Phase 1 completed local parser/scoring proof of concept

**Created:** 10 October 2026  
**Checkpoint:** Phase 1 Block 3 Steps 7–9 **COMPLETE/PASS — LOCAL POC ONLY**. No app, server, production scoring or Android testing yet.

## Included

- `parser.py` — v0.4.0-poc standalone format parser for the five approved games.
- `scoring.py` — five **owner-approved** pure score *preview* functions; they NEVER award points.
- `approved_scoring_rules_v1.json` and `SCORING_RULES_APPROVED.md` — approved rule versions and exact scoring tables, including Minute Cryptic supersession.
- `identity.py` — research-only puzzle identity and uniqueness candidate utilities.
- `wordlegroup_five_game_anonymized.jsonl` — 258 pseudonymised five-game shares; 116 Wordle, 33 Minute Cryptic, 70 FoxiMax, 18 Polygonle, 21 Krillion. The raw private group export is NOT bundled.
- `approved_scoring_corpus_preview.json` — non-awarding aggregates under the newly approved formulas.
- `test_scoring_approved.py` — 24 new owner-approved rule tests, plus previous preserved tests and historical candidate-only comparisons (52 tests).
- `tests_phase1_block3_approved_2026-10-10.txt` — captured 76/76 PASS terminal test run.
- `scoring_v0_historical.py` — previous **superseded provisional** Minute Cryptic calculation; no longer used.
- `scoring_candidates.py`, `test_scoring_candidates.py` and historical proposals — archived pre-approval evidence, not the active policy.
- `baseline_block1/` — original Phase 1 Block 1 parser as a historical snapshot.

## Reproduce tests

Use Python 3.10+ (the core code has standard-library dependencies only):

```bash
cd puzzle_league_phase1_block3_APPROVED
python -m unittest discover -v
```

Expected from the verified checkpoint: **76 tests, 0 failures, 0 errors**. The test log is included, but a later machine's own run is separate evidence.

## Current rules and operational boundaries

All five rules are owner-approved in `scoring.py`. The previous Minute Cryptic community-par coefficient is obsolete. A sample of 440 in Krillion yields **6 performance plus 1 participation = 7 total**; it does not yield 7 performance.

This code produces **only score previews**. ALL parser results keep `scoring_eligible=false`; score outputs include `awarded=false`, `result_accepted=false`. Results of FoxiMax, Polygonle and Krillion retain `needs_review` because mode/date must be confirmed; merely approving their scoring formulas did not authorise auto-accepting unverified shares.

No authenticated accounts, uniqueness constraints, season score snapshots, late-48-hour enforcement, database writes, frontend or Android app behavior were implemented in Phase 1. Do not publish these research fixtures as official players' results.

## Next chat

Upload this ZIP plus `Puzzle_League_Project_Guide_v1.7_PHASE1_LOCAL_POC_PASS_PHASE2_BLOCK1_NEXT_2026-10-10.md`. Work only on **Phase 2 Block 1 / Steps 1–3**: inspect actual environment, decide architecture and create/verify the reproducible repository/tooling. Preserve this Phase 1 POC as evidence and baseline.
