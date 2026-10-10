# Phase 1 Block 1 parser contract v0.1.0-poc

Input: UTF-8 raw single share or pasted WhatsApp transcript. `split_messages()` separates WhatsApp `[HH:MM, DD/MM/YYYY] Sender:` transport wrappers. Never interpret sender as authenticated account or wrapper timestamp as official game day. The exact share body is preserved in `raw_text`.

Output per message: `transport` (nullable, metadata only), `parsed` with `parser_version`, `game`, `status`, `raw_text`, `fields`, `issues`, `scoring_eligible` (always `false` in POC). Statuses: `recognized_valid` = structurally recognisable, **not authenticated or awardable**; `invalid` = explicit syntax/contradiction; `ambiguous` = apparent known game but unhandled format; `needs_review` = recognised research-only game; `unrecognized` = chat/unsupported text. `duplicate` must be determined separately from server-side account/game/puzzle uniqueness; this local stateless parser cannot assign it.

Wordle: numeric `puzzle_number` (comma optional), attempts 1–6 or null for `X/6`, `completed_failure`, five-cell row arrays, and `puzzle_date` null until external identity/day verified. Accept `⬜` and `⬛` absent tiles, `🟨` misplaced, `🟩` correct. Ensure exact row count, winning all-green final row for wins, and no winning row for failures. Prevent zero or negative puzzle numbers. Scoring deferred to Phase 1 Block 2.

Minute Cryptic: literal published date, quoted clue/length, integer `hints_used`, signed `signed_under_par_difference` (under positive, over negative, matched zero), transient `solver_count_observed`, optional textual `time_display`, `puzzle_number` null. Do not infer par from solver count, emoji length, WhatsApp date, or score. Validate recognised shape conservatively; output carries unresolved `community_par_semantics_unverified`, `hint_taxonomy_unverified`. Current one-sample format is not comprehensive (notably hint types, new line variants and failure states). No scoring or award until policy validation.

Other game names are recognised at header level only: FoxiMax, Polygonle, Krillion. They are explicitly not enabled as supported parsers. Human chat messages are `unrecognized`, never counted. Input fixtures contain WhatsApp sender names: replace/anonymise before public sharing or Git commits. This research fixture is user-provided, not externally authenticated; local test only verifies it parses as specified.

Invariant: no result from this POC is score eligible. The later API must enforce one account/game/puzzle result; moderation, 48-hour rule, league eligibility, scoring, auditing and authentication are outside this block.

Run: `python -m unittest -v test_parser`; `python parser.py < samples.txt > parsed_output.json`. Python 3 standard library only.
