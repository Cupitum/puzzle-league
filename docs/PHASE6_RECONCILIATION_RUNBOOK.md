# Phase 6 — Remaining recognition & reconciliation (prepared, not accepted)

## Anchor and scope
Exact source ZIP comment: `4f96c44262ed88ba0738a0e0571fa380630ab28a`. 11 previously registered local migrations. Existing five scoring functions and Phase 1 research unchanged. A 12th forward-only migration is **prepared but not applied**. There is no live database content in the archive, so the number and actual identities of pending submissions cannot be independently established here. The owner reports six, including three Polygonle.

## Evidence and identity
Do not claim that a number/day matches the official game without evidence for the *specific* puzzle. Official Polygonle tips say Daily is 6–8 letters, midnight local, and Unlimited/Custom/Mini also exist. Screenshot or player report is not equivalent to independently verified date. Do not use submission timestamp as the daily date. Capture direct official archives/site confirmations and time zone assumptions per candidate. Third-party archives (especially Krillion clones) must not be silently treated as authoritative for krillion.io.

## Safely install
1. From the original clean `~/Desktop/Development/Puzzle_League` at `4f96c44`, extract package outside repo; run `bash APPLY_TO_REPO.sh "$HOME/Desktop/Development/Puzzle_League"`. No .git replacement.
2. Back up local DB outside Git with an operator-controlled `pg_dump -Fc` and validate `pg_restore --list`; ensure the backup can be restored independently before the migration. Review migration and `git diff`.
3. Apply forward-only migration locally using `npx --no-install supabase migration up --local` (never `db reset`). This is required only if performing subsequent operator-approved reparses; read-only reporting itself needs no migration.
4. From repo, configure local psql connection using existing private credentials (`PGPASSWORD`/`.pgpass`, never commit). Set `PL_RECONCILE_OUT="$HOME/Desktop/Puzzle_League_Backups/phase6_reconciliation"`, `PL_RUN_DB_READONLY=1`, and run `bash scripts/phase6/verify.sh` once. The script reads only pending rows and saves a **private** restricted report; never paste raw text or identifiers publicly. It does not assert actual identity proof or execute repairs.

## Three Polygonle and other pending records
Inspect the private `pending_reconciliation.json` and independently source-check six reported pending submissions. The report records *candidate* parser result, prior parser, sha256, identity match, current review/decision/award count and mode/day evidence. If fewer/more than six appear, investigate; do not force a number. Any record with conflicting identity, previous decision, award, unsupported mode, or unverifiable day stays in moderation.

## Explicit audited reparse — NOT automatic
For each eligible pending record, an operator with administrative local DB privileges may execute **one** `select app_private.p6_reparse_pending(...)` within an explicit transaction after independently comparing current `raw_share_text`, hash, new parser fields, original puzzle identity and source evidence. The function refuses accepted/rejected, any scored entry or previous decision, and mismatched raw/hash/parser state. It changes only `parsed_fields`, `parse_status`, `parser_version`. It appends immutable `p6_pending_reparse_events` and existing `competition_events`; never changes raw share, puzzle link, verified puzzle date, awards, approval requests/decisions or scoring versions. No auto-award occurs. All subsequent acceptance/award actions must go via the existing independent moderator `review` action and its authorisation and date checks. **Do not run the function from frontend, with service-role credentials copied into client code, or with a fabricated evidence URI.**

Example operator-only template (replace all placeholders, review before COMMIT):
```sql
BEGIN;
SELECT app_private.p6_reparse_pending(
  '<submission-uuid>', '<sha256-of-original-raw>', '<current-parser-version>',
  'p4-1.0.0', 'needs_review', '<reviewed-parser-fields-json>'::jsonb,
  '<operator-initials>', '<specific explanation of parser discrepancy>',
  '<verifiable official evidence URL or private signed evidence reference>');
-- Verify the updated submission, original raw hash, append-only event and no score changes.
-- COMMIT only after independent review; otherwise ROLLBACK.
ROLLBACK;
```
A strong owner requirement is to preserve *all existing awards*, including historical voided awards: the guard blocks on **any** league_score_entries row, not only live awards.

## Acceptance
Gate A: local code/static/Node/Python/Vitest/build tests PASS. Gate B: DB report reconciles actual six or explains discrepancies; official date/mode checks documented separately per source; three Polygonle records handled as individually justified or left pending. Gate C: any executed reparse produces immutable audit events and preserves before/after snapshots, existing awards, decisions, and raw bytes. Gate D: all actual moderation/league standings checks pass independently. Phase 6 as a whole remains OPEN pending managed Supabase, Cloudflare HTTPS, executed GitHub Actions, backup restore, installed Android HTTPS Share Target and real pilot.
