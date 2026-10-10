# Puzzle League — Phase 1 WordleGroup corpus update

**Date:** 2026-10-10. **Parser:** `0.3.0-poc`. **Local test result:** 37/37 PASS.

This folder contains the original Phase 1 POC research code and new anonymized fixture imports for the **five approved games only**. There is no PWA, backend, account verification, official integration or score award. All scoring results from `scoring.py` are *previews*; Wordle's versioned table is approved, Minute Cryptic's formula is provisional, and three other games have no approved score calculation.

## Evidence

One user-provided WhatsApp ZIP had two representations of one conversation (`chat.txt`, `chat.md`). Processed only `chat.txt` (432 messages). Excluded 174 other messages; kept 258 game shares: 116 Wordle, 33 Minute Cryptic, 70 FoxiMax, 18 Polygonle, 21 Krillion. The new corpus contains real `Wordle X/6` (4), `FoxiMax X/8` (4, 🟥 tiles), `Polygonle 😔/6` (1), and seven-/eight-tile Polygonle rows.

Earlier small fixture batches overlap this new source; **do not add their record counts as if they were new unique submissions**. Four number-based games do not encode an independently verified puzzle date in the share. No WhatsApp sender can substitute for an authenticated app account. Do not derive points from a WhatsApp export.

The original private group ZIP is intentionally **not** included. Sender identities have been replaced with player labels `P01`–`P05`. Ordinary chat was excluded. One trailing chat comment after a Wordle share was removed from the publishable fixture and explicitly flagged in its record. Historical source snippets in `baseline_block1/samples.txt` and the old parsed output have likewise been anonymized for this package. Original upload remains with the user.

## Run

From this directory, using Python 3 (standard library only):

```bash
python -m unittest discover -v
```

`wordlegroup_five_game_anonymized.jsonl` and `wordlegroup_ingestion_report.json` are self-contained; the private WhatsApp ZIP is **not** needed to run tests.

To regenerate those derivative assets *if you have the private ZIP locally*:

```bash
python import_wordlegroup.py /path/to/WordleGroup.zip
```

This writes anonymized fixtures and aggregate report, overwriting the local copies. Do not commit or publish the private source ZIP. Consult `CONTRACT.md`, `SCORING_PROPOSALS_NOT_APPROVED.md`, and the separately delivered authoritative Project Guide v1.5 for controls and remaining scoring-policy decisions.
