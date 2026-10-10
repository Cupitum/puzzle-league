> **CURRENT PHASE 1 v0.4.0 POC OVERRIDE (2026-10-10):** All five scoring policies are owner-approved and implemented as non-awarding previews in `scoring.py`. Earlier sections below record previous policy/coverage checkpoints and are historical where they say scoring is unapproved. FoxiMax, Polygonle and Krillion remain `needs_review` for date/mode verification; parser `scoring_eligible=false` for every share. See `SCORING_RULES_APPROVED.md` and `README_PHASE1_APPROVED.md`.

# Phase 1 Block 1 parser contract v0.1.0-poc

Input: UTF-8 raw single share or pasted WhatsApp transcript. `split_messages()` separates WhatsApp `[HH:MM, DD/MM/YYYY] Sender:` transport wrappers. Never interpret sender as authenticated account or wrapper timestamp as official game day. The exact share body is preserved in `raw_text`.

Output per message: `transport` (nullable, metadata only), `parsed` with `parser_version`, `game`, `status`, `raw_text`, `fields`, `issues`, `scoring_eligible` (always `false` in POC). Statuses: `recognized_valid` = structurally recognisable, **not authenticated or awardable**; `invalid` = explicit syntax/contradiction; `ambiguous` = apparent known game but unhandled format; `needs_review` = recognised research-only game; `unrecognized` = chat/unsupported text. `duplicate` must be determined separately from server-side account/game/puzzle uniqueness; this local stateless parser cannot assign it.

Wordle: numeric `puzzle_number` (comma optional), attempts 1–6 or null for `X/6`, `completed_failure`, five-cell row arrays, and `puzzle_date` null until external identity/day verified. Accept `⬜` and `⬛` absent tiles, `🟨` misplaced, `🟩` correct. Ensure exact row count, winning all-green final row for wins, and no winning row for failures. Prevent zero or negative puzzle numbers. Scoring deferred to Phase 1 Block 2.

Minute Cryptic: literal published date, quoted clue/length, integer `hints_used`, signed `signed_under_par_difference` (under positive, over negative, matched zero), transient `solver_count_observed`, optional textual `time_display`, `puzzle_number` null. Do not infer par from solver count, emoji length, WhatsApp date, or score. Validate recognised shape conservatively; output carries unresolved `community_par_semantics_unverified`, `hint_taxonomy_unverified`. Current one-sample format is not comprehensive (notably hint types, new line variants and failure states). No scoring or award until policy validation.

Other game names are recognised at header level only: FoxiMax, Polygonle, Krillion. They are explicitly not enabled as supported parsers. Human chat messages are `unrecognized`, never counted. Input fixtures contain WhatsApp sender names: replace/anonymise before public sharing or Git commits. This research fixture is user-provided, not externally authenticated; local test only verifies it parses as specified.

Invariant: no result from this POC is score eligible. The later API must enforce one account/game/puzzle result; moderation, 48-hour rule, league eligibility, scoring, auditing and authentication are outside this block.

Run: `python -m unittest -v test_parser`; `python parser.py < samples.txt > parsed_output.json`. Python 3 standard library only.

---

## Phase 1 Block 2 extension (v0.2.0-poc, 2026-10-10)

The original v0.1.0 description above remains historical evidence. Current `parser.py` is `0.2.0-poc`. The previously unknown three formats now have typed **review-only** extraction, **not** scoring acceptance.

- New dataset: Sep 6–7 user-supplied shares, six Wordle and one Minute Cryptic; an unrelated Globle share remains `unrecognized`. All person names are anonymised in distributed fixtures. Original sample fixtures are preserved in the original user-supplied ZIP; copied `samples.txt` in this new package is anonymised.
- Wordle: 1,905 and 1,906 each appear from three people. This is *not* duplication without a common authenticated account. Whites and black empty-tile styles pass. Puzzle date remains unknown from the Wordle share itself.
- Minute Cryptic: `🏋️` icon with 6 hints / 3 over community par now passes while prior `🏆` passes. Raw icon captured in `result_icon`. Par/hint semantics remain under review.
- FoxiMax: `fraction_numerator` / `fraction_denominator`, `letter_count_displayed`, 5-wide grid rows; puzzle number captured. Structural status `needs_review`, completion/fraction semantics unresolved until approved.
- Polygonle: `puzzle_number`, success/failure, row-count/last-green checks, pattern header raw, observed word length, grid, optional streak. Currently real eight-character examples only; tentative 5–8 format capability is **not** a real sample claim. `needs_review` until scoring and variation approval.
- Krillion: `puzzle_number`, header icon raw, integer `reported_number`, and an **opaque** seven-symbol sample trail. Only structural validation; numerical/symbol interpretations are not approval to score. `needs_review`.
- Unsupported/malformed or unexpected variants stay `unrecognized`/`ambiguous`/`invalid` and may not score. `recognized_valid` is only syntactic validity, not player authentication. No result in this research parser is `scoring_eligible`.
- New `scoring.py` runs two standalone previews with separate rule version IDs and `awarded:false`: approved Wordle fixed table and provisional Minute Cryptic formula. No scoring implementation exists for the other three. See `SCORING_PROPOSALS_NOT_APPROVED.md`.
- New `identity.py` provides `(game, source ID)` identity candidates and an illustration of `(authenticated account ID, game, source ID)` uniqueness. It does **not** authenticate WhatsApp senders, check puzzle dates against official game archives, persist data, block duplicates or submit results. These remain server responsibilities.

**Verification:** `python -m unittest discover -v` -> 26 tests PASS (11 inherited + 15 additional), 0 failures on 2026-10-10. Dataset 20 messages; 17 in-scope game shares (8 Wordle; 2 Minute Cryptic; 3 FoxiMax; 2 Polygonle; 2 Krillion) and 3 out-of-scope/non-game records. All 20 return `scoring_eligible:false`. No Android, DB, backend, official result authentication or league scoring done.

---

## Phase 1 extended real-corpus validation (v0.3.0-poc, 2026-10-10)

The above v0.1 and v0.2 sections are historic implementation notes, not the current parser version.

- User supplied `WordleGroup.zip` containing **two renderings of one WhatsApp conversation**: `chat.txt` and `chat.md`. New `import_wordlegroup.py` imports **chat.txt only**, interprets its US-style `[M/D/YY, h:mm:ss AM/PM]` transport wrapper, and exports only puzzle shares for the five approved game types. Neither sender name nor transport timestamp is an authenticated account or an authoritative puzzle date.
- Imported **432 source messages**, **258 five-game records**, **174 other/excluded messages**. Fixtures contain player pseudonyms `P01`–`P05` and omit ordinary chat. One Wordle message appended personal commentary after its completed grid: the importer drops that comment from the exported fixture, flags this provenance, and the parser handles the unredacted case with `needs_review` rather than invalidating a legitimate grid. The private source ZIP is intentionally **not repackaged**.
- The 258 observed puzzle records: Wordle 116, Minute Cryptic 33, FoxiMax 70, Polygonle 18 and Krillion 21. Distinct candidate puzzles by game: 45, 28, 40, 11 and 13 respectively. These are archive totals, **not additive** to earlier excerpts from the same conversation.
- **Wordle:** observed **four real `X/6`** shares, in addition to numeric 2–6 successes. 115 raw shares are syntactically `recognized_valid`; one raw message with appended commentary is `needs_review`. In the **anonymized trimmed fixture** all 116 shares have a valid standalone Wordle format. No `1/6` found in this source; previous synthetic 1/6 test remains.
- **FoxiMax:** observed **four real `X/8`** failures with 🟥 red tiles (all 8 rows), plus successful numeric `N/8` including 1/8 and 8/8. Current typed parser accepts the actual `X` header and 🟥 cells; loss `fraction_numerator=null`, `completed_failure=true`. It remains `needs_review` and cannot receive points without approved scoring. A validated X header is distinct from an ordinary 8/8 header.
- **Polygonle:** real seven-cell and eight-cell rows now observed (five 7-cell, thirteen 8-cell shares); includes one real `😔/6` failure. Scoring remains review-only. Other word lengths have not been observed in this group.
- **Minute Cryptic:** 33 real shares have hints ranging 0–12 and signed reported under-par difference ranging −8 to +2; the previously recognised emoji variants are exercised. Extracted fields are syntactic only, not an independently verified interpretation of community par.
- **Krillion:** 21 examples, observed reported integers from 60 through 440; symbol-trail meaning, level of completion and conversion to performance points remain unapproved.
- **Identity:** zero repeated `(WhatsApp transport sender, game, extracted puzzle identity)` candidates in this one export; not a database uniqueness test and not evidence of authenticated user IDs. For count purposes, Wordle/FoxiMax/Polygonle/Krillion identity is header number and Minute Cryptic identity is source date; external authoritative date mapping remains unknown.
- `test_wordlegroup_corpus.py` uses **self-contained anonymized fixtures** (`wordlegroup_five_game_anonymized.jsonl`) and does not need the original private export ZIP to run. `wordlegroup_ingestion_report.json` contains non-identifying aggregated evidence. All local outputs remain `scoring_eligible=false`; even approved Wordle `scoring.py` values are **previews**, not awards.

**Verified:** `python -m unittest discover -v` in this package: **37 tests PASS, 0 failures**, including 26 inherited tests and 11 added corpus regressions. Actual UI, backend, automatic deduplication, global score allocation and Android sharing are NOT TESTED. Phase 1 completion remains OPEN pending an approved scoring-policy decision and any agreed follow-up validation.
