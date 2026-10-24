# Operator-controlled daily identity evidence — Polishing D-01/D-14

**This is a protected ingestion contract, not a cron-driven universal counter.** No source records are shipped or assumed verified. Automatic new-submission acceptance is possible ONLY when an independent reference has actually been checked and registered by a trusted database administrator. Registering a source is a privileged, auditable action, not available to league owners/moderators or application service_role. Original shares, frozen scoring rules and existing records are preserved.

## Five contracts

| Game | Independent evidence required | Conflict/unsafe mode |
|---|---|---|
| Wordle | Published number→calendar day; current official NYT source or independently cross-checked documented archive | Number conflict, grid invalid, expiration |
| Minute Cryptic | Published puzzle date **and exact official clue** for that day | User-entered date or clue mismatch |
| FoxiMax | Official original **8-attempt** daily number and verified daily date/mode | /6, local midnight or variant unverified |
| Polygonle | Regular daily 6–8-letter /6 number and **official pattern**; local-midnight reset explicitly checked | Mini, unlimited, other word length, timezone ambiguity |
| Krillion Daily Dive | Verified official `krillion.io` daily-dive number/day and authentic reset reference | Unlimited/practice, inconsistent daily source, score outside 0–700 |

The word **Krillion** appears on multiple unrelated websites with mutually inconsistent advertised reset times; `krillion.io` is the designated official game URL from the approved catalog. A site's name alone does not verify it. Never synthesize a date from a phone clock, server clock or +1 number progression. Verify published official source, authorization to fetch, publication clock, timestamp and source outage policy for each game before enabling unattended ingestion.

## Evidence entry (operator only)

1. Independently obtain and preserve the official page/dated publication and corroboration, checking original game mode and reset timezone. Document the date, source URI and a SHA-256 fingerprint of the collected reference snapshot; do **not** store user puzzle solutions or account credentials.
2. In a trusted administrator database console, review the proposed `app_private.p7_register_daily_reference` call with explicit typed parameters. Supply `p_game`, `p_key`, `p_day`, `p_mode`, `p_kind`, `p_source_url`, `p_digest`, `p_observed_at`, `p_valid_until`, and, where applicable, `p_clue` or `p_pattern`. These must be verified facts, **not placeholders or calculated offsets**. `p_mode` must be one of `published_number`, `published_date_clue`, `original_8`, `standard_6to8`, `daily_dive` corresponding to its game.
3. Require a fresh, unexpired reference valid no more than 96 hours after observation. The database blocks duplicate references, conflicting verified days, unapproved games and untrusted operator roles. It then records protected source metadata, invokes the existing operator-only verification function and writes an immutable competition event. No historic submissions or awards are updated by this operation.
4. Observe new genuine submissions; the Edge handler checks the exact current reference through service-role-only `p7_identity_reference`, applies per-game shape/clue/pattern/mode checks and calls the **existing** competition dispatcher. The dispatcher remains the only award authority (48-hour window, season eligibility, membership, duplicate constraint and scoring version). If lookup times out, source data is stale/conflicting, or identity/mode is uncertain, the handler sends `needs_review` instead of inventing verification.
5. For pending hosted history, `pending_sources` offers evidence/suggestions only. An independent authorised human reviewer examines the original share, reference and league rules; no automated backfill or point award is performed. Never import/replay the six separate local pending examples.

## Operational rollout switch

There is **no automatic feed deployed** by this package, because genuine source availability, permission and reproducibility for all five games have not been proven. Do not insert synthetic fixture references in hosted. Until an independently sourced daily record exists, new submissions remain pending and the UI says so. This deferral is intentional, safe and must be part of the final release decision: it does not satisfy the target of five automatically verified genuine shares without further evidence.

## Safe reviewer and audit expectations

Reviewer output includes hashed original share, reference SHA-256, reference type, whether the requesting reviewer is independent and a suggested inspection reason. Exposing this information never mutates submission state. Only the existing protected independent review RPC can resolve a request, with the existing no-self-approval rule. Treat the source registry and competition event records as immutable evidence.
