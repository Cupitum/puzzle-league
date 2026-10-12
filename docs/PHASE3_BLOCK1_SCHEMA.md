# Puzzle League — Phase 3 Block 1 initial schema (proposed implementation)

**Source:** Project Guide v2.1, approved Phase 1 scoring rules, archived commit `4f0220e`.  
**Scope:** Database/schema only. No authentication UI, users, permission policies, accepted results, point awards or live deployments.

## Tables in this migration

| Table | Function | Protection |
|---|---|---|
| `profiles` | Public nicknames, ID points to Supabase Auth PK | Auth FK; RLS on, no policies |
| `games` | Five approved catalog IDs and approved *reference* rule version | Seeded identifiers, not activated scoring |
| `leagues` | Persistent community, owner, public/private visibility and required timezone | Owner profile FK; no guessed timezone default |
| `league_memberships` | History of membership episodes and roles | Only one active row per league+account; owner identified through `leagues` |
| `game_puzzles` | Mode-specific puzzle identity candidates/verification | Unique per game+mode+identity; puzzle date nullable; no fabricated official days |
| `result_submissions` | Exact raw share and processing metadata | Account FK; resolved puzzle FK; uniqueness per account+resolved puzzle; raw text immutable |

`game_puzzles.verification_state='candidate'` does **not** mean a valid dated game puzzle. Do not award points merely because the record exists or carries a numeric ID. The `result_submissions.review_status` field reserves future states but there is **no API, ingestion, acceptance function or score allocation** here. Any trusted acceptance function must additionally verify puzzle identity/mode/date, age/deadline and account eligibility.

## Deferred to designated phases

- **Phase 3 Block 2:** Auth/profile creation mechanism, tested RLS policies, visibility and owner/moderator/member permissions. Zero API policies intentionally means zero direct client access now.
- **Phase 3 Block 3:** audit, moderation/approval decision tables, migration/recovery/security tests.
- **Phase 4:** parser port/integration; trustworthy eligibility; 48-hour window; idempotent accepted result; one league award per accepted result and season; immutable correction trail.
- **Phase 5:** seasons, frozen game/scoring versions, scores, league-specific eligibility, membership dates and automatic renewal.
- **Phases 6–9:** PWA, Android sharing, moderation UI, deployment and real pilot.

### Known structural boundaries / implementation decisions

- Owner is determined by `leagues.owner_user_id`; membership `role` only distinguishes ordinary member vs delegated moderator. Real permission enforcement is **not** yet implemented.
- Membership rejoining can create a new historical row after old `left_at` is set. Overlapping historical intervals, owner membership consistency and full role delegation require later transactional rules.
- Timezone is required but the local database does not validate membership in IANA's timezone database. A trusted league-creation handler must do so.
- A `game_puzzles` row is keyed by game, explicit mode and identity key. Source candidates must be reviewed and linked to verified official puzzle data before acceptance. The schema does not independently authenticate a game's publisher data.
- One resolved submission row per account/puzzle is enforced, including pending/rejected submissions. Corrections should update through an audited workflow rather than create a second row. Unresolved shares may coexist pending review, and need later reconciliation.
- A composite FK ensures the submission's game matches the resolved puzzle's game. No score tables or point-awarding functions exist.
- Raw text is immutable under normal UPDATE. Trusted future corrections must preserve prior interpretations/audit changes.
- Only the five game catalogue rows are seeded. No users, sample WhatsApp identities, puzzle-day mappings or test results are imported.
- SQL grants to `anon` and `authenticated` are revoked and RLS has no policies. Do not describe this as verified authenticated role/league permissions; that is later work.

## Transfer and verification instructions

1. Copy the files from the accompanying ZIP into the **existing** Linux project root `/home/cupitum/Desktop/Development/Puzzle_League_Phase2_Complete_Commit_4f0220e`. Preserve your existing `supabase/config.toml`, `package.json`, and `package-lock.json`. This ZIP **does not include** those existing files. It includes an intentionally empty `supabase/seed.sql` so Supabase CLI seed configuration resolves cleanly.
2. Inspect the migration and record baseline before applying. `supabase db reset` is **destructive to the local database**; run it only after confirming there is no local data you need to retain. It has not run in the assistant environment.
3. From that project root, with Supabase already started:

   ```bash
   npx --no-install supabase db reset --local --network-id puzzle-league-local
   ```

4. After successful local migration, run structural checks:

   ```bash
   DB_CONTAINER=$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -n 1)
   test -n "$DB_CONTAINER" || { echo 'Supabase database container not running'; exit 1; }
   docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/phase3_block1_schema_checks.sql
   ```

5. Verify repeatability with a **second** local reset only after first migration and checks PASS. Inspect resulting tables and ensure the migration/verification changes are packaged for application to Windows `main` without recreating Git history.

**Evidence boundary:** The pack is a prepared migration; all SQL execution, database validation and Phase 3 completion claims are **NOT TESTED** until the user's actual Linux/Windows terminal results are supplied.
