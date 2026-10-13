-- Puzzle League Phase 3 / Block 2 / Step 5: least-privilege READ policies.
-- Requires initial schema (20261012170000) and Auth profiles (20261013220000).
-- Step 6 will separately implement controlled league/member writes and delegation.
-- Phase 4 will separately implement trusted puzzle/submission access and scoring.
-- DO NOT grant writes on any public table in this migration.

-- A membership check in a separate, non-API-exposed schema avoids circular
-- policies when a league must consult the membership table.
create schema app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create function app_private.is_current_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.league_memberships as lm
        where lm.league_id = p_league_id
          and lm.user_id = (select auth.uid())
          and lm.left_at is null
    );
$$;

-- This narrow helper answers only membership for the CURRENT JWT identity.
-- It does not take a caller-supplied user ID or return private membership rows.
revoke all on function app_private.is_current_member(uuid)
    from public, anon, authenticated;
grant execute on function app_private.is_current_member(uuid)
    to authenticated;

-- Explicitly keep all six tables RLS-protected and preserve deny-by-default
-- on the not-yet-integrated puzzle and submission tables.
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.leagues enable row level security;
alter table public.league_memberships enable row level security;
alter table public.game_puzzles enable row level security;
alter table public.result_submissions enable row level security;

revoke all on table
    public.profiles,
    public.games,
    public.leagues,
    public.league_memberships,
    public.game_puzzles,
    public.result_submissions
from anon, authenticated;

-- Table GRANTs are required in addition to RLS policies. Only SELECT is
-- deliberately granted here; every client INSERT/UPDATE/DELETE stays denied.
grant select on table public.games, public.leagues to anon, authenticated;
grant select on table public.profiles, public.league_memberships to authenticated;

create policy games_catalogue_read
    on public.games
    for select to anon, authenticated
    using (true);

-- No email is stored in profiles; nevertheless, for now users read ONLY self.
create policy profiles_self_read
    on public.profiles
    for select to authenticated
    using (id = (select auth.uid()));

-- Public leagues may be discovered by everybody, including logged-out users.
create policy leagues_public_read
    on public.leagues
    for select to anon, authenticated
    using (visibility = 'public');

-- Private leagues are readable only by their owner or ACTIVE members.
-- The helper runs with a fixed search_path as the migration owner (postgres)
-- and reads the membership table without recursive RLS evaluation.
create policy leagues_owner_or_member_read
    on public.leagues
    for select to authenticated
    using (
        owner_user_id = (select auth.uid())
        or (select app_private.is_current_member(id))
    );

-- Until Step 6 defines owner/moderator list access, users see only their own
-- membership rows (including old rows, which are historical records).
create policy league_memberships_self_read
    on public.league_memberships
    for select to authenticated
    using (user_id = (select auth.uid()));

-- No client grants or policies are added for game_puzzles/result_submissions.
-- Their identity/review/awarding functions do not exist yet.
