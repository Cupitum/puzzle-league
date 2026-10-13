-- Puzzle League Phase 3 Block 2 / Step 5: read-only RLS boundary regression.
-- Run after applying 20261013220100. All test fixtures are rolled back.
-- Uses PostgreSQL SET LOCAL ROLE/JWT claims to exercise policies; does not
-- replace a future real signed-token/API integration test.
-- Must be executed as postgres on the *local* Supabase database.

begin;

-- Four disposable auth identities; Step 4 trigger makes four profiles.
select set_config('puzzle_step5.owner', gen_random_uuid()::text, true);
select set_config('puzzle_step5.member', gen_random_uuid()::text, true);
select set_config('puzzle_step5.former', gen_random_uuid()::text, true);
select set_config('puzzle_step5.outsider', gen_random_uuid()::text, true);
select set_config('puzzle_step5.public_league', gen_random_uuid()::text, true);
select set_config('puzzle_step5.private_league', gen_random_uuid()::text, true);
select set_config('puzzle_step5.other_private_league', gen_random_uuid()::text, true);

insert into auth.users(id, email)
select current_setting('puzzle_step5.' || who)::uuid,
       'puzzle-step5-' || current_setting('puzzle_step5.' || who) || '@example.invalid'
from (values ('owner'), ('member'), ('former'), ('outsider')) as v(who);

insert into public.leagues(id, owner_user_id, name, visibility, time_zone)
values
 (current_setting('puzzle_step5.public_league')::uuid,
  current_setting('puzzle_step5.owner')::uuid, 'step5-public-fixture', 'public', 'Africa/Johannesburg'),
 (current_setting('puzzle_step5.private_league')::uuid,
  current_setting('puzzle_step5.owner')::uuid, 'step5-private-fixture', 'private', 'Africa/Johannesburg'),
 (current_setting('puzzle_step5.other_private_league')::uuid,
  current_setting('puzzle_step5.outsider')::uuid, 'step5-outsider-fixture', 'private', 'Africa/Johannesburg');

insert into public.league_memberships
  (league_id, user_id, role, joined_at, effective_from, left_at)
values
 (current_setting('puzzle_step5.private_league')::uuid,
  current_setting('puzzle_step5.member')::uuid,
  'member', now() - interval '2 days', now() - interval '2 days', null),
 (current_setting('puzzle_step5.private_league')::uuid,
  current_setting('puzzle_step5.former')::uuid,
  'member', now() - interval '3 days', now() - interval '3 days', now() - interval '1 day');

-- Validate policy existence, SELECT-only grants and excluded functions/tables.
do $$
declare
    policy_total integer;
begin
    if (select count(*) from public.profiles where id in (
        current_setting('puzzle_step5.owner')::uuid,
        current_setting('puzzle_step5.member')::uuid,
        current_setting('puzzle_step5.former')::uuid,
        current_setting('puzzle_step5.outsider')::uuid
    )) <> 4 then
        raise exception 'Step 4 profile trigger did not create four test profiles';
    end if;

    select count(*) into policy_total
    from pg_policies where schemaname = 'public' and policyname in (
        'games_catalogue_read', 'profiles_self_read', 'leagues_public_read',
        'leagues_owner_or_member_read', 'league_memberships_self_read'
    );
    if policy_total <> 5 then
        raise exception 'Expected five named Step 5 read policies, got %', policy_total;
    end if;

    if not has_table_privilege('anon', 'public.games', 'SELECT')
       or not has_table_privilege('anon', 'public.leagues', 'SELECT')
       or has_table_privilege('anon', 'public.profiles', 'SELECT')
       or has_table_privilege('anon', 'public.league_memberships', 'SELECT')
       or not has_table_privilege('authenticated', 'public.profiles', 'SELECT')
       or not has_table_privilege('authenticated', 'public.league_memberships', 'SELECT')
       or not has_table_privilege('authenticated', 'public.leagues', 'SELECT') then
        raise exception 'Unexpected SELECT grants';
    end if;

    if has_schema_privilege('anon', 'app_private', 'USAGE')
       or has_function_privilege('anon', 'app_private.is_current_member(uuid)', 'EXECUTE')
       or not has_function_privilege('authenticated', 'app_private.is_current_member(uuid)', 'EXECUTE') then
        raise exception 'Private membership helper privileges are incorrect';
    end if;

    if exists (
        select 1 from (values
          ('profiles'), ('games'), ('leagues'), ('league_memberships'),
          ('game_puzzles'), ('result_submissions')
        ) as tables(table_name)
        where has_table_privilege('anon', 'public.' || table_name, 'INSERT')
           or has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
           or has_table_privilege('anon', 'public.' || table_name, 'DELETE')
           or has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')
           or has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')
           or has_table_privilege('authenticated', 'public.' || table_name, 'DELETE')
    ) then
        raise exception 'Step 5 unexpectedly enabled client write privileges';
    end if;

    if exists (
        select 1 from (values ('game_puzzles'), ('result_submissions')) as t(table_name)
        where has_table_privilege('anon', 'public.' || table_name, 'SELECT')
           or has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
    ) then
        raise exception 'Puzzle/submission access opened prematurely';
    end if;
    raise notice 'PASS: read-only grants, five policies, and closed write/submission boundaries';
end;
$$;

-- Anonymous: catalogue + public league, but no private leagues and no
-- profile, membership, puzzle or submission reads.
set local role anon;
do $$
begin
    if (select count(*) from public.games) <> 5 then
        raise exception 'Anon catalogue read must return five approved games';
    end if;
    if not exists (select 1 from public.leagues where id =
        current_setting('puzzle_step5.public_league')::uuid) then
        raise exception 'Anon cannot discover public league';
    end if;
    if exists (select 1 from public.leagues where id in (
        current_setting('puzzle_step5.private_league')::uuid,
        current_setting('puzzle_step5.other_private_league')::uuid
    )) then
        raise exception 'Anon can discover private leagues';
    end if;
    raise notice 'PASS: anon can read only public league fixtures and game catalogue';
end;
$$;
reset role;

-- Auth owner: sees own profile, public league, owned private league, but
-- cannot see another owner's private league or another person's profile.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_step5.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_step5.owner')), true);
do $$
begin
    if auth.uid() is distinct from current_setting('puzzle_step5.owner')::uuid then
        raise exception 'Owner JWT identity simulation failed';
    end if;
    if not exists (select 1 from public.profiles where id = auth.uid())
       or exists (select 1 from public.profiles where id = current_setting('puzzle_step5.member')::uuid) then
        raise exception 'Profile self-read is not enforced for owner';
    end if;
    if not exists (select 1 from public.leagues where id = current_setting('puzzle_step5.private_league')::uuid)
       or exists (select 1 from public.leagues where id = current_setting('puzzle_step5.other_private_league')::uuid) then
        raise exception 'Owner league visibility failure';
    end if;
    raise notice 'PASS: owner reads own private league and own profile, not other private league';
end;
$$;
reset role;

-- Current member: sees private league but no other people's profiles;
-- can inspect their own membership row and cannot see somebody else's row.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_step5.member'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_step5.member')), true);
do $$
begin
    if auth.uid() is distinct from current_setting('puzzle_step5.member')::uuid then
        raise exception 'Member JWT identity simulation failed';
    end if;
    if not exists (select 1 from public.leagues where id = current_setting('puzzle_step5.private_league')::uuid)
       or exists (select 1 from public.leagues where id = current_setting('puzzle_step5.other_private_league')::uuid) then
        raise exception 'Active membership visibility failure';
    end if;
    if (select count(*) from public.league_memberships where league_id =
         current_setting('puzzle_step5.private_league')::uuid) <> 1 then
        raise exception 'Member can read another member historical record or cannot read own';
    end if;
    if exists (select 1 from public.profiles where id = current_setting('puzzle_step5.owner')::uuid) then
        raise exception 'Member can read owner profile directly';
    end if;
    raise notice 'PASS: current member reads only eligible league, own membership and profile';
end;
$$;
reset role;

-- Former member sees their own historical membership, but NOT the private
-- league because the membership has left_at populated.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_step5.former'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_step5.former')), true);
do $$
begin
    if exists (select 1 from public.leagues where id = current_setting('puzzle_step5.private_league')::uuid) then
        raise exception 'Former member still sees private league';
    end if;
    if (select count(*) from public.league_memberships where league_id =
         current_setting('puzzle_step5.private_league')::uuid) <> 1 then
        raise exception 'Former member cannot read own historical membership';
    end if;
    raise notice 'PASS: former member loses private league access but retains own history';
end;
$$;
reset role;

-- Outsider owns a separate private league, but sees no other owner's
-- private league or foreign memberships.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_step5.outsider'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_step5.outsider')), true);
do $$
begin
    if not exists (select 1 from public.leagues where id =
         current_setting('puzzle_step5.other_private_league')::uuid)
       or exists (select 1 from public.leagues where id =
         current_setting('puzzle_step5.private_league')::uuid) then
        raise exception 'Outsider/private-owner separation failure';
    end if;
    if exists (select 1 from public.league_memberships where league_id =
         current_setting('puzzle_step5.private_league')::uuid) then
        raise exception 'Outsider can see other memberships';
    end if;
    raise notice 'PASS: outsider denied foreign private league and foreign memberships';
end;
$$;
reset role;

rollback;
