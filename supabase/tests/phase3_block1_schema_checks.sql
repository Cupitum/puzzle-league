-- Phase 3 Block 1 structural and constraint verification.
-- Execute AFTER applying migration, from project root:
--  DB_CONTAINER=$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -n 1)
--  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/phase3_block1_schema_checks.sql
-- Test data changes are rolled back. No real Auth users or scores are created.

begin;

do $$
declare
    t text;
    rls_flag boolean;
    forbidden_policies integer;
    duplicate_failed boolean := false;
    fk_failed boolean := false;
begin
    foreach t in array array[
        'profiles', 'games', 'leagues', 'league_memberships',
        'game_puzzles', 'result_submissions'
    ] loop
        if to_regclass(format('public.%I', t)) is null then
            raise exception 'Missing table: public.%', t;
        end if;
        select c.relrowsecurity into rls_flag
        from pg_class c where c.oid = to_regclass(format('public.%I', t));
        if rls_flag is distinct from true then
            raise exception 'RLS is not enabled on public.%', t;
        end if;
    end loop;

    select count(*) into forbidden_policies
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
          'profiles', 'games', 'leagues', 'league_memberships',
          'game_puzzles', 'result_submissions'
      ]);
    if forbidden_policies <> 0 then
        raise exception 'Block 1 should have 0 client RLS policies, got %', forbidden_policies;
    end if;

    if (select count(*) from public.games) <> 5 then
        raise exception 'Expected 5 approved game catalogue rows';
    end if;
    if not exists (
        select 1 from public.games
        where id = 'wordle' and approved_rule_version = 'wordle-fixed-v1-approved'
    ) then
        raise exception 'Wordle rule version differs from approved version';
    end if;

    -- Real duplicate test for per-game/mode/identity puzzle uniqueness.
    insert into public.game_puzzles(game_id,mode,identity_key)
      values ('wordle', 'daily', 'number:99999999');
    begin
        insert into public.game_puzzles(game_id,mode,identity_key)
          values ('wordle', 'daily', 'number:99999999');
    exception when unique_violation then
        duplicate_failed := true;
    end;
    if not duplicate_failed then
        raise exception 'Duplicate game puzzle identity was allowed';
    end if;

    begin
        insert into public.game_puzzles(game_id,mode,identity_key)
          values ('unsupported_game', 'daily', 'number:99999999');
    exception when foreign_key_violation then
        fk_failed := true;
    end;
    if not fk_failed then
        raise exception 'Unknown game ID was not rejected by FK';
    end if;

    if not exists (
        select 1 from pg_indexes
        where schemaname = 'public'
          and indexname = 'result_submission_one_account_per_puzzle'
          and indexdef ilike '%UNIQUE INDEX%'
    ) then
        raise exception 'Resolved submission uniqueness index is missing';
    end if;
    if not exists (
        select 1 from pg_indexes
        where schemaname = 'public'
          and indexname = 'league_membership_one_active_per_user'
          and indexdef ilike '%UNIQUE INDEX%'
    ) then
        raise exception 'Active membership uniqueness index is missing';
    end if;
    if not exists (
        select 1 from pg_trigger
        where tgname = 'result_submission_raw_immutable' and not tgisinternal
    ) then
        raise exception 'Raw source immutability trigger is missing';
    end if;

    raise notice 'PASS: six tables, deny-default RLS, five games, puzzle uniqueness, FK, submission/membership indexes, raw immutability trigger';
end;
$$;

rollback;
