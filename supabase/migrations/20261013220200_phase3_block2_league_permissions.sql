-- Puzzle League Phase 3 / Block 2 / Step 6: initial league role/delegation primitives.
-- Requires Step 4 profiles and Step 5 read-only RLS migration.
-- No direct client writes to public tables are granted.
-- No join/invitation, league creation, seasons or result-scoring APIs here.
-- Deliberately narrow privilege: view_member_roster. Other moderation
-- capabilities require separately approved rules and later migrations.

-- Delegations belong to a particular ACTIVE membership record, not merely
-- an account; leaving/rejoining must not inherit historical moderator grants.
create table app_private.league_moderator_delegations (
    membership_id uuid not null
        references public.league_memberships(id) on delete cascade,
    permission_name text not null
        check (permission_name in ('view_member_roster')),
    granted_at timestamptz not null default now(),
    primary key (membership_id, permission_name)
);

alter table app_private.league_moderator_delegations enable row level security;
revoke all on table app_private.league_moderator_delegations
    from public, anon, authenticated;

-- SECURITY DEFINER checks use a fixed search_path, current JWT identity and
-- explicit ownership, and never accept an arbitrary *acting* user id.
-- The definer bypasses circular membership RLS evaluation.
create function app_private.can_view_league_roster(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        exists (
            select 1 from public.leagues as l
            where l.id = p_league_id
              and l.owner_user_id = (select auth.uid())
        )
        or exists (
            select 1
            from public.league_memberships as m
            join app_private.league_moderator_delegations as d
              on d.membership_id = m.id
             and d.permission_name = 'view_member_roster'
            where m.league_id = p_league_id
              and m.user_id = (select auth.uid())
              and m.left_at is null
              and m.role = 'moderator'
        );
$$;

revoke all on function app_private.can_view_league_roster(uuid)
    from public, anon, authenticated;
grant execute on function app_private.can_view_league_roster(uuid)
    to authenticated;

-- Retain Step 5 self-history read policy. This additional policy exposes
-- ACTIVE roster records to owners and explicitly delegated moderators only.
create policy league_memberships_authorised_roster_read
    on public.league_memberships
    for select to authenticated
    using (
        left_at is null
        and (select app_private.can_view_league_roster(league_id))
    );

-- RPC 1: only league OWNER can appoint/revoke the moderator role on an
-- existing, currently active membership. Promotion alone grants NO
-- moderation action, and demotion removes all explicit delegations.
create function app_private.apply_league_moderator(
    p_league_id uuid,
    p_member_user_id uuid,
    p_is_moderator boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_membership_id uuid;
begin
    if p_league_id is null or p_member_user_id is null
       or p_is_moderator is null
       or auth.uid() is null
       or not exists (
           select 1 from public.leagues
           where id = p_league_id and owner_user_id = auth.uid()
       ) then
        raise exception 'Only the league owner can change moderator roles'
            using errcode = '42501';
    end if;

    if p_member_user_id = auth.uid() then
        raise exception 'Owner cannot assign a separate moderator role to self'
            using errcode = '22023';
    end if;

    select id into v_membership_id
    from public.league_memberships
    where league_id = p_league_id
      and user_id = p_member_user_id
      and left_at is null
    for update;

    if v_membership_id is null then
        raise exception 'No active membership for this user and league'
            using errcode = '22023';
    end if;

    update public.league_memberships
    set role = case when p_is_moderator then 'moderator' else 'member' end
    where id = v_membership_id;

    if not p_is_moderator then
        delete from app_private.league_moderator_delegations
        where membership_id = v_membership_id;
    end if;
end;
$$;

revoke all on function app_private.apply_league_moderator(uuid, uuid, boolean)
    from public, anon, authenticated;
grant execute on function app_private.apply_league_moderator(uuid, uuid, boolean)
    to authenticated;

-- API-visible wrapper stays SECURITY INVOKER. The privileged operation and
-- owner check live exclusively in the non-exposed app_private schema.
create function public.set_league_moderator(
    p_league_id uuid,
    p_member_user_id uuid,
    p_is_moderator boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
    select app_private.apply_league_moderator(
        p_league_id, p_member_user_id, p_is_moderator
    );
$$;

revoke all on function public.set_league_moderator(uuid, uuid, boolean)
    from public, anon, authenticated;
grant execute on function public.set_league_moderator(uuid, uuid, boolean)
    to authenticated;

-- RPC 2: only the OWNER may grant/revoke the *named* roster privilege to an
-- existing ACTIVE moderator. Unsupported permissions are always rejected.
create function app_private.apply_league_moderator_permission(
    p_league_id uuid,
    p_member_user_id uuid,
    p_permission_name text,
    p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_membership_id uuid;
begin
    if p_league_id is null or p_member_user_id is null
       or p_enabled is null or auth.uid() is null
       or not exists (
           select 1 from public.leagues
           where id = p_league_id and owner_user_id = auth.uid()
       ) then
        raise exception 'Only the league owner can delegate permissions'
            using errcode = '42501';
    end if;

    if p_permission_name is distinct from 'view_member_roster' then
        raise exception 'Unsupported moderator permission'
            using errcode = '22023';
    end if;

    select id into v_membership_id
    from public.league_memberships
    where league_id = p_league_id
      and user_id = p_member_user_id
      and left_at is null
      and role = 'moderator'
    for update;

    if v_membership_id is null then
        raise exception 'Delegation requires an active moderator membership'
            using errcode = '22023';
    end if;

    if p_enabled then
        insert into app_private.league_moderator_delegations
            (membership_id, permission_name)
        values (v_membership_id, 'view_member_roster')
        on conflict (membership_id, permission_name) do nothing;
    else
        delete from app_private.league_moderator_delegations
        where membership_id = v_membership_id
          and permission_name = 'view_member_roster';
    end if;
end;
$$;

revoke all on function app_private.apply_league_moderator_permission(uuid, uuid, text, boolean)
    from public, anon, authenticated;
grant execute on function app_private.apply_league_moderator_permission(uuid, uuid, text, boolean)
    to authenticated;

create function public.set_league_moderator_permission(
    p_league_id uuid,
    p_member_user_id uuid,
    p_permission_name text,
    p_enabled boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
    select app_private.apply_league_moderator_permission(
        p_league_id, p_member_user_id, p_permission_name, p_enabled
    );
$$;

revoke all on function public.set_league_moderator_permission(uuid, uuid, text, boolean)
    from public, anon, authenticated;
grant execute on function public.set_league_moderator_permission(uuid, uuid, text, boolean)
    to authenticated;

-- Deliberately unchanged: no direct anon/authenticated DML on profiles,
-- games, leagues, league_memberships, game_puzzles or result_submissions.
-- Membership joins/leaves/invitations remain Phase 5; moderation/audit
-- features requiring decisions and event history remain Phase 3 Block 3/7.
