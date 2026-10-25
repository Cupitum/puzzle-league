# Puzzle League Phase 9 — Local-Calendar Daily Identity v1 (P9)

**Source baseline**: uploaded git archive comment `45fd682e776f53ba46c6814907ce0aca819e3b78` (P8 feature commit), supplied 25 October 2026. This source is not evidence of the current hosted merge SHA. The P8 hosted pilot had 17 applied migrations. This implementation adds **one** forward-only migration, #18. It does not edit previous migration files, existing shares, archived awards, or approvals.

## Owner-approved policy

All players use their **browser's current local date**. The frontend submits `local_day` and UTC offset (minutes). The Edge worker and SQL verify that local day against their own current server clock and the bounded browser offset. There is **no automated alternate-day/timezone lookup**. Correct daily share number/date + approved score shape => automatic acceptance eligible. Mismatch => **historical_exception** review; no immediate points. Manual reviewer approval follows existing league/season/eligibility rules. Unrecognisable/invalid shares remain in the existing safe path. P9 checks score format, not authenticity of editable source text.

| Game | 2026-10-25 anchor | Next day |
|---|---:|---:|
| Wordle | 1954 | 1955 |
| FoxiMax | 1520 | 1521 |
| Krillion | 102 | 103 |
| Polygonle | 1547 | 1548 |
| Minute Cryptic | 2026-10-25 | 2026-10-26 |

Performance points, +1 participation, independent moderation, immutable original text, per-league score allocations and season snapshots remain unchanged. **Polygonle does not require an independently verified official pattern** for this explicitly approved local-counter method; the shared pattern and grid are still structurally parsed. P7 operator-proven references remain stored as historical/optional evidence; P9 does not pretend to have official independent evidence. Existing pending results are not automatically reprocessed or awarded.

## Files changed

- `src/ui/App.tsx` — captures local date and UTC offset during submit.
- `supabase/functions/competition/daily-identity.mjs` — pure five-game date/number calculation and mode/shape guard.
- `supabase/functions/competition/index.ts` — uses new calendar rule instead of requiring a P7 reference; still authenticates caller before RPC.
- `supabase/migrations/20261025120000_p9_local_calendar_identity.sql` — pure date calculation functions plus full P8 dispatcher replacement with a changed submit branch only; SQL independently validates date and preview score, creates a verified day record for supported valid share keys, handles duplicate across historic/daily modes, creates historical review requests for mismatches, logs rule/decision. Keeps all other dispatcher branches unchanged.
- `supabase/tests/p9_local_calendar_identity.sql` — transactional, rollback-only anchor/timezone/privilege tests.
- `scripts/phase4/tests/local-calendar-identity.test.mjs` — positive and negative five-game tests.
- `scripts/phase9/verify.sh` — local consolidated gate.

## Install and test order (no automatic DB changes by install)

1. In Ubuntu, inspect `git status --short --branch` and ensure current intended source files match the supplied archive. Review `CHANGE.patch`; only then run the package's `bash APPLY.sh "$HOME/Desktop/Development/Puzzle_League"`. It checks original file hashes and patch applicability, and **does not run SQL/deploy**.
2. Verify new files, run `node --test scripts/phase4/tests/parser.test.mjs scripts/phase4/tests/polygonle-target.test.mjs scripts/phase4/tests/local-calendar-identity.test.mjs`. Run `npm run check` if dependencies are installed.
3. Take a fresh private backup of the existing local database. Apply only pending **migration #18** to the existing local Supabase database using your current approved `supabase migration up --local` workflow; do **not** use `db reset` or apply an old release gate expecting 13/16/17 migrations. Inspect `supabase migration list --local` for 18/18 before verifying.
4. Run **one** consolidated local gate: `bash scripts/phase9/verify.sh`. It executes Node/regressions, app checks, and a rollback-only SQL acceptance query against the exact local DB container. It does not certify real authenticated submission/awards or a hosted rollout.
5. Do a **disposable real signed-in acceptance** with five correct-current-day shares, two historical/mismatch shares, a duplicate, a moderator approval, and a non-review-authorized account. Inspect receipt, `league_score_entries`, moderation queue, and identity audit, ensuring historical submitted originals and awarded entries are unchanged. Do not test by re-awarding real member data.
6. Only after all local gates pass, stage and review these files, commit/push to the intended existing `main` (no force push), take a fresh private hosted backup, and use current managed Supabase/Cloudflare deployment processes to apply only migration #18 and deploy the updated `competition` Edge Function and frontend. PWA Share Target must be retested on Android after hosted deploy. Perform one grouped hosted acceptance before declaring completion. Do not disable Supabase Auth Confirm Email.

## Current implementation limits

- Input devices can alter their clocks/time zone or edit shared result text. Offset bounds and server clock consistency help avoid accidental timestamp errors, **not determined proof of location or genuine gameplay**. This is the approved pilot trust model.
- A result with an implausible, malformed or future identifier cannot be certified by the counter. It remains pending for independent operator verification before a reviewer may approve it. Existing review controls never award an unverified record.
- Late review can only award where the existing season and membership constraints allow it. Finalised seasons remain protected.
- Existing pending history is not bulk-verified, migrated, duplicated or awarded; a new attempt with the same account/game/puzzle receives a duplicate receipt instead of creating a second result.
- Only `calendar_day` mode for the five approved games is activated; adding games still requires an approved anchor and parser/scorer contract.
- SQL and authenticated Supabase/Edge integration cannot be executed in the authoring environment. This handover is **PREPARED, NOT DEPLOYED**, until the owner executes real local/hosted gates.
