-- Phase 3 Block 2 Step 6: owner/moderator/member permission tests.
-- RUN ONLY against disposable/local Supabase DB as postgres after Step 6 migration.
-- All fixtures and modifications are inside a rolled-back transaction.
-- JWT identities are simulated using set role + request.jwt.claims.
-- Signed-token HTTP/RPC validation remains a separate future gate.

begin;

do $$
begin
  perform set_config('puzzle_s6.owner', gen_random_uuid()::text, true);
  perform set_config('puzzle_s6.member', gen_random_uuid()::text, true);
  perform set_config('puzzle_s6.mod', gen_random_uuid()::text, true);
  perform set_config('puzzle_s6.outsider', gen_random_uuid()::text, true);
  perform set_config('puzzle_s6.league', gen_random_uuid()::text, true);
  perform set_config('puzzle_s6.other', gen_random_uuid()::text, true);
end;
$$;

insert into auth.users (id, email)
select current_setting('puzzle_s6.' || who)::uuid,
       'step6-' || current_setting('puzzle_s6.' || who) || '@example.invalid'
from (values ('owner'), ('member'), ('mod'), ('outsider')) as identities(who);

insert into public.leagues (id, owner_user_id, name, visibility, time_zone)
values
 (current_setting('puzzle_s6.league')::uuid,
  current_setting('puzzle_s6.owner')::uuid, 'step6-owner-fixture', 'private', 'Africa/Johannesburg'),
 (current_setting('puzzle_s6.other')::uuid,
  current_setting('puzzle_s6.outsider')::uuid, 'step6-other-fixture', 'private', 'Africa/Johannesburg');

insert into public.league_memberships (league_id, user_id, role)
values
 (current_setting('puzzle_s6.league')::uuid, current_setting('puzzle_s6.member')::uuid, 'member'),
 (current_setting('puzzle_s6.league')::uuid, current_setting('puzzle_s6.mod')::uuid, 'member');

do $$
begin
  if to_regclass('app_private.league_moderator_delegations') is null then
    raise exception 'Delegation table is missing';
  end if;
  if (select count(*) from pg_policies
      where schemaname='public' and tablename='league_memberships'
        and policyname='league_memberships_authorised_roster_read') <> 1 then
    raise exception 'Roster read policy is missing';
  end if;
  if not has_function_privilege('authenticated',
       'public.set_league_moderator(uuid,uuid,boolean)', 'EXECUTE')
    or not has_function_privilege('authenticated',
       'public.set_league_moderator_permission(uuid,uuid,text,boolean)', 'EXECUTE')
    or has_function_privilege('anon',
       'public.set_league_moderator(uuid,uuid,boolean)', 'EXECUTE')
    or has_function_privilege('anon',
       'public.set_league_moderator_permission(uuid,uuid,text,boolean)', 'EXECUTE')
    or has_table_privilege('authenticated',
       'app_private.league_moderator_delegations', 'SELECT')
    or has_table_privilege('authenticated',
       'app_private.league_moderator_delegations', 'INSERT') then
    raise exception 'Unexpected function or private delegation grants';
  end if;
  if exists (
    select 1 from (values ('profiles'), ('games'), ('leagues'),
      ('league_memberships'), ('game_puzzles'), ('result_submissions')) as t(name)
    where has_table_privilege('authenticated','public.' || t.name,'INSERT')
       or has_table_privilege('authenticated','public.' || t.name,'UPDATE')
       or has_table_privilege('authenticated','public.' || t.name,'DELETE')
       or has_table_privilege('anon','public.' || t.name,'INSERT')
       or has_table_privilege('anon','public.' || t.name,'UPDATE')
       or has_table_privilege('anon','public.' || t.name,'DELETE')
  ) then
    raise exception 'Step 6 accidentally exposed public-table writes';
  end if;
  if has_table_privilege('authenticated', 'public.game_puzzles', 'SELECT')
     or has_table_privilege('authenticated', 'public.result_submissions', 'SELECT') then
    raise exception 'Puzzle/submission reads must remain closed';
  end if;
  raise notice 'PASS: function grants, private delegation table, and closed direct-write boundaries';
end;
$$;

set local role anon;
do $$
begin
  if has_function_privilege(current_user,
       'public.set_league_moderator(uuid,uuid,boolean)', 'EXECUTE') then
    raise exception 'Anonymous users can invoke moderator appointment';
  end if;
  if exists (select 1 from public.leagues where id=current_setting('puzzle_s6.league')::uuid) then
    raise exception 'Anonymous user can read private league';
  end if;
  raise notice 'PASS: anonymous denied role/delegation RPCs and private league';
end;
$$;
reset role;

-- Member sees only their own row, cannot change roles via direct update or RPC.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.member'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.member')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 1 then
    raise exception 'Member sees other membership rows';
  end if;
  begin
    perform public.set_league_moderator(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.member')::uuid, true);
    raise exception 'Member illegally promoted self';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_league_moderator_permission(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.member')::uuid, 'view_member_roster', true);
    raise exception 'Member illegally granted self a delegation';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: ordinary member cannot read roster or grant own powers';
end;
$$;
reset role;

-- Owner sees the active roster, can appoint moderator and delegate privilege.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.owner')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 2 then
    raise exception 'League owner cannot see both active membership rows';
  end if;
  begin
    perform public.set_league_moderator_permission(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
    raise exception 'Owner delegated before assigning moderator role';
  exception when invalid_parameter_value then null;
  end;
  perform public.set_league_moderator(current_setting('puzzle_s6.league')::uuid,
     current_setting('puzzle_s6.mod')::uuid, true);
  begin
    perform public.set_league_moderator_permission(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.mod')::uuid, 'delete_results', true);
    raise exception 'Unsupported moderator privilege accepted';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: owner can see active roster, appoint moderator, but cannot grant unknown privileges';
end;
$$;
reset role;

-- A moderator WITHOUT explicit delegation remains self-only.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.mod'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.mod')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 1 then
    raise exception 'Undelegated moderator can see others';
  end if;
  begin
    perform public.set_league_moderator_permission(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
    raise exception 'Moderator self-delegation succeeded';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: moderator role alone does not grant roster privilege or self-delegation';
end;
$$;
reset role;

-- Now the owner explicitly delegates the roster permission.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.owner')), true);
select public.set_league_moderator_permission(
    current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
-- Repeat grant must be idempotent.
select public.set_league_moderator_permission(
    current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.mod'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.mod')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 2 then
    raise exception 'Delegated moderator cannot view active roster';
  end if;
  if exists (select 1 from public.league_memberships where league_id=
      current_setting('puzzle_s6.other')::uuid) then
    raise exception 'Delegated moderator can see another league roster';
  end if;
  raise notice 'PASS: explicitly delegated moderator sees only their league active roster';
end;
$$;
reset role;

-- Owner revocation removes roster access immediately.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.owner')), true);
select public.set_league_moderator_permission(
    current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', false);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.mod'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.mod')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 1 then
    raise exception 'Revoked moderator still sees active roster';
  end if;
  raise notice 'PASS: owner revocation restores moderator self-only access';
end;
$$;
reset role;

-- Owner demotion purges delegated rights, promotion again does not resurrect.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.owner')), true);
select public.set_league_moderator_permission(
    current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
select public.set_league_moderator(current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, false);
select public.set_league_moderator(current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, true);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.mod'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.mod')), true);
do $$
begin
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 1 then
    raise exception 'Delegation incorrectly survived demotion/re-promotion';
  end if;
  raise notice 'PASS: demotion removes grants; re-promotion does not restore them';
end;
$$;
reset role;

-- Outsider can access their own league, but cannot change this league's roles.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.outsider'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.outsider')), true);
do $$
begin
  if exists (select 1 from public.leagues where id=current_setting('puzzle_s6.league')::uuid) then
    raise exception 'Outsider reads foreign private league';
  end if;
  begin
    perform public.set_league_moderator(
      current_setting('puzzle_s6.league')::uuid,
      current_setting('puzzle_s6.member')::uuid, true);
    raise exception 'Foreign owner changed membership role';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: owner of another league cannot change foreign memberships';
end;
$$;
reset role;

-- Simulate an eventual authorised leave action as postgres. The active grant
-- stays tied to that historical membership, so it cannot confer access now.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.owner'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.owner')), true);
select public.set_league_moderator_permission(
    current_setting('puzzle_s6.league')::uuid,
    current_setting('puzzle_s6.mod')::uuid, 'view_member_roster', true);
reset role;
update public.league_memberships
set left_at = now()
where league_id=current_setting('puzzle_s6.league')::uuid
  and user_id=current_setting('puzzle_s6.mod')::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('puzzle_s6.mod'), true);
select set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('puzzle_s6.mod')), true);
do $$
begin
  if exists (select 1 from public.leagues where id=current_setting('puzzle_s6.league')::uuid) then
    raise exception 'Former moderator can still read private league';
  end if;
  if (select count(*) from public.league_memberships where league_id=
      current_setting('puzzle_s6.league')::uuid) <> 1 then
    raise exception 'Former moderator reads extra rows or lost own history';
  end if;
  raise notice 'PASS: former moderator loses league/roster access but keeps own history';
end;
$$;
reset role;

rollback;
