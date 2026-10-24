-- Puzzle League Polishing: additive, protected security features.
-- Deployment guard: isolated restore rehearsal AND platform Auth recovery plan required.
-- Never modify frozen scoring, originals, historical decisions or awards.

-- All active moderators can view their league roster, but no other power is implicit.
create or replace function app_private.can_view_league_roster(p_league_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.leagues l where l.id=p_league_id and l.owner_user_id=auth.uid())
    or exists(select 1 from public.league_memberships m
      where m.league_id=p_league_id and m.user_id=auth.uid()
        and m.role='moderator' and m.left_at is null)
  );
$$;
revoke all on function app_private.can_view_league_roster(uuid) from public,anon,authenticated;
grant execute on function app_private.can_view_league_roster(uuid) to authenticated;

-- The old roster grant remains harmless for legacy clients; new actionable grants
-- apply ONLY to a specific active moderator membership and are owner-controlled.
alter table app_private.league_moderator_delegations
  drop constraint if exists league_moderator_delegations_permission_name_check;
alter table app_private.league_moderator_delegations
  add constraint polishing_moderator_permission_names
  check (permission_name in ('view_member_roster','manage_invitations','manage_members'));

create function app_private.p7_is_owner(p_actor uuid,p_league uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.leagues l where l.id=p_league and l.owner_user_id=p_actor);
$$;
create function app_private.p7_is_mod(p_actor uuid,p_league uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.league_memberships m where m.league_id=p_league
    and m.user_id=p_actor and m.role='moderator' and m.left_at is null);
$$;
create function app_private.p7_can(p_actor uuid,p_league uuid,p_capability text)
returns boolean language sql stable security definer set search_path='' as $$
  select app_private.p7_is_owner(p_actor,p_league) or exists (
    select 1 from public.league_memberships m
    join app_private.league_moderator_delegations d on d.membership_id=m.id
    where m.league_id=p_league and m.user_id=p_actor and m.role='moderator'
      and m.left_at is null and d.permission_name=p_capability
      and p_capability in ('manage_invitations','manage_members'));
$$;

-- Private request register, status history and complete denial of league-role access.
create table app_private.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id),
  status text not null default 'identity_verified' check (status in (
    'identity_verified','under_review','awaiting_owner_resolution','completed','declined','cancelled')),
  identity_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index polishing_one_open_deletion_request
  on app_private.account_deletion_requests(account_id)
  where status in ('identity_verified','under_review','awaiting_owner_resolution');
create index polishing_deletion_queue on app_private.account_deletion_requests(status,created_at);
create table app_private.account_deletion_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null references app_private.account_deletion_requests(id),
  actor_id uuid,
  actor_kind text not null check(actor_kind in ('verified_user','platform_admin')),
  event text not null,
  occurred_at timestamptz not null default clock_timestamp()
);
alter table app_private.account_deletion_requests enable row level security;
alter table app_private.account_deletion_audit enable row level security;
revoke all on app_private.account_deletion_requests,app_private.account_deletion_audit from public,anon,authenticated;
revoke all on sequence app_private.account_deletion_audit_id_seq from public,anon,authenticated;
create trigger polishing_deletion_events_immutable before update or delete on app_private.account_deletion_audit
 for each row execute function app_private.prevent_audit_history_mutation();

-- Status cannot be rewritten by API or silently manipulated in a privileged session.
-- The trigger creates evidence even for direct administrative SQL updates.
create function app_private.p7_guard_deletion_update()
returns trigger language plpgsql set search_path='' as $$
begin
 if current_user not in ('postgres','supabase_admin') then
    raise exception 'Only platform administrators can change request status' using errcode='42501';
 end if;
 if new.id is distinct from old.id or new.account_id is distinct from old.account_id
    or new.identity_verified_at is distinct from old.identity_verified_at
    or new.created_at is distinct from old.created_at
    or new.status is not distinct from old.status
    or old.status in ('completed','declined','cancelled')
    or new.status not in ('under_review','awaiting_owner_resolution','completed','declined','cancelled') then
    raise exception 'Invalid account deletion state transition' using errcode='22023';
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger polishing_guard_deletion_status before update on app_private.account_deletion_requests
 for each row execute function app_private.p7_guard_deletion_update();
create function app_private.p7_audit_deletion_update()
returns trigger language plpgsql set search_path='' as $$
begin
 insert into app_private.account_deletion_audit(request_id,actor_kind,event)
 values(new.id,'platform_admin',new.status);
 return new;
end $$;
create trigger polishing_audit_deletion_status after update on app_private.account_deletion_requests
 for each row execute function app_private.p7_audit_deletion_update();

-- Manual admin-only status transition: never deletes an account, scores or shares.
create function app_private.p7_admin_deletion_status(p_request uuid,p_new_status text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_old app_private.account_deletion_requests%rowtype;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'Trusted platform administrator session required' using errcode='42501';
 end if;
 if p_new_status not in ('under_review','awaiting_owner_resolution','completed','declined','cancelled') then
   raise exception 'Invalid transition' using errcode='22023';
 end if;
 select * into strict v_old from app_private.account_deletion_requests where id=p_request for update;
 if v_old.status in ('completed','declined','cancelled') or v_old.status=p_new_status then
   raise exception 'Terminal or redundant transition' using errcode='22023';
 end if;
 update app_private.account_deletion_requests set status=p_new_status,updated_at=now() where id=p_request;
end $$;
revoke all on function app_private.p7_admin_deletion_status(uuid,text) from public,anon,authenticated,service_role;

-- Single explicit service-role API. The Edge Function MUST validate the JWT and
-- supply p_actor itself; no client may select an arbitrary acting user.
create function public.p7_polishing(p_actor uuid,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_league uuid; v_user uuid; v_member uuid; v_perm text; v_enabled boolean;
 v_token uuid; v_id uuid; v_role text; v_request uuid; v_count integer;
 v_now timestamptz:=now();
begin
 if p_actor is null or not exists(select 1 from public.profiles p where p.id=p_actor)
    or p_action not in ('roster','set_permission','create_invitation','revoke_invitation',
      'manage_member','deletion_status','request_deletion','pending_evidence')
    or p_data is null or jsonb_typeof(p_data)<>'object' then
   raise exception 'Invalid authenticated action' using errcode='42501';
 end if;
 if p_action='deletion_status' then
   return coalesce((select jsonb_agg(jsonb_build_object('request_id',id,'status',status,
     'created_at',created_at,'updated_at',updated_at) order by created_at desc)
     from app_private.account_deletion_requests where account_id=p_actor),'[]'::jsonb);
 elsif p_action='request_deletion' then
   -- Only Edge calls this after verifying fresh password against Supabase Auth.
   -- Service-role-only RPC; no user-supplied verification flag is accepted.
   if exists(select 1 from app_private.account_deletion_requests
      where account_id=p_actor and status in ('identity_verified','under_review','awaiting_owner_resolution')) then
     raise exception 'Request already pending' using errcode='22023';
   end if;
   if (select count(*) from app_private.account_deletion_requests
       where account_id=p_actor and created_at>v_now-interval '30 days')>=3 then
     raise exception 'Request rate limit reached' using errcode='42501';
   end if;
   insert into app_private.account_deletion_requests(account_id)
      values(p_actor) returning id into v_request;
   insert into app_private.account_deletion_audit(request_id,actor_id,actor_kind,event)
      values(v_request,p_actor,'verified_user','identity_verified');
   return jsonb_build_object('request_id',v_request,'status','identity_verified',
     'message','Request recorded for manual platform-administrator review');
 end if;

 v_league:=(p_data->>'league_id')::uuid;
 if v_league is null then raise exception 'League required' using errcode='22023'; end if;
 if p_action='roster' then
   if not (app_private.p7_is_owner(p_actor,v_league) or app_private.p7_is_mod(p_actor,v_league)) then
     raise exception 'Roster denied' using errcode='42501';
   end if;
   return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'user_id',x.user_id,
      'username',p.nickname,'role',x.role,'joined_at',x.joined_at,'permissions',x.permissions)
      order by lower(p.nickname),x.user_id)
    from (
      select m.id,m.user_id,case when l.owner_user_id=m.user_id then 'owner' else m.role end as role,m.joined_at,
        case when l.owner_user_id=m.user_id then
         '["roster","review","manage_invitations","manage_members","manage_moderators"]'::jsonb
        else
         (select coalesce(jsonb_agg(d.permission_name order by d.permission_name),'[]'::jsonb)
          from app_private.league_moderator_delegations d where d.membership_id=m.id) ||
         (case when exists(select 1 from app_private.league_review_delegations rd
           where rd.membership_id=m.id) then '["review"]'::jsonb else '[]'::jsonb end)
        end as permissions
      from public.league_memberships m join public.leagues l on l.id=m.league_id
        where m.league_id=v_league and m.left_at is null
      union all
      select null::uuid,l.owner_user_id,'owner',l.created_at,
        '["roster","review","manage_invitations","manage_members","manage_moderators"]'::jsonb
      from public.leagues l where l.id=v_league
        and not exists(select 1 from public.league_memberships m
          where m.league_id=l.id and m.user_id=l.owner_user_id and m.left_at is null)
    ) x join public.profiles p on p.id=x.user_id),'[]'::jsonb);
 elsif p_action='set_permission' then
   if not app_private.p7_is_owner(p_actor,v_league) then
     raise exception 'Owner only' using errcode='42501';
   end if;
   v_user:=(p_data->>'member_id')::uuid;
   v_perm:=p_data->>'permission';
   v_enabled:=(p_data->>'enabled')::boolean;
   if v_perm not in ('manage_invitations','manage_members') or v_enabled is null then
     raise exception 'Unsupported permission' using errcode='22023';
   end if;
   select id into v_member from public.league_memberships where league_id=v_league
     and user_id=v_user and role='moderator' and left_at is null for update;
   if v_member is null then raise exception 'Active moderator required' using errcode='42501'; end if;
   if v_enabled then
     insert into app_private.league_moderator_delegations(membership_id,permission_name)
       values(v_member,v_perm) on conflict do nothing;
   else
     delete from app_private.league_moderator_delegations
       where membership_id=v_member and permission_name=v_perm;
   end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id,details)
     values(p_actor,'polishing_permission_changed',v_league,v_member,
       jsonb_build_object('capability',v_perm,'enabled',v_enabled));
   return jsonb_build_object('permission',v_perm,'enabled',v_enabled);
 elsif p_action='create_invitation' then
   if not app_private.p7_can(p_actor,v_league,'manage_invitations') then
      raise exception 'Invitation delegation required' using errcode='42501'; end if;
   insert into app_private.league_invitations(league_id,issued_by,expires_at,max_uses)
     values(v_league,p_actor,v_now+interval '7 days',1) returning token into v_token;
   insert into app_private.competition_events(actor_id,action,league_id)
     values(p_actor,'polishing_invitation_created',v_league);
   return jsonb_build_object('invite_token',v_token,'expires_at',v_now+interval '7 days');
 elsif p_action='revoke_invitation' then
   if not app_private.p7_can(p_actor,v_league,'manage_invitations') then
      raise exception 'Invitation delegation required' using errcode='42501'; end if;
   v_token:=(p_data->>'invite_token')::uuid;
   update app_private.league_invitations set revoked_at=v_now
     where league_id=v_league and token=v_token and revoked_at is null returning id into v_id;
   if v_id is null then raise exception 'Invitation unavailable' using errcode='22023'; end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
     values(p_actor,'polishing_invitation_revoked',v_league,v_id);
   return jsonb_build_object('revoked',true);
 elsif p_action='manage_member' then
   if not app_private.p7_can(p_actor,v_league,'manage_members') then
      raise exception 'Member delegation required' using errcode='42501'; end if;
   v_user:=(p_data->>'member_id')::uuid;
   if v_user=p_actor or v_user=(select owner_user_id from public.leagues where id=v_league) then
      raise exception 'Cannot manage self or owner' using errcode='42501'; end if;
   select id,role into v_member,v_role from public.league_memberships
      where league_id=v_league and user_id=v_user and left_at is null for update;
   if v_member is null or v_role<>'member' then
      raise exception 'Only ordinary active members are manageable' using errcode='42501'; end if;
   if p_data->>'operation'='remove' then
      update public.league_memberships set left_at=v_now where id=v_member;
      delete from app_private.league_review_delegations where membership_id=v_member;
      delete from app_private.league_moderator_delegations where membership_id=v_member;
   elsif p_data->>'operation'='suspend' then
      if length(btrim(coalesce(p_data->>'reason',''))) not between 3 and 2000 then
        raise exception 'Suspension reason required' using errcode='22023'; end if;
      insert into app_private.league_suspensions(league_id,user_id,suspended_by,reason,active)
        values(v_league,v_user,p_actor,btrim(p_data->>'reason'),true)
        on conflict(league_id,user_id) do update set suspended_by=excluded.suspended_by,
        reason=excluded.reason,created_at=v_now,suspended_until=null,active=true;
      update public.league_memberships set left_at=v_now where id=v_member;
   else raise exception 'Unsupported member operation' using errcode='22023'; end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id,details)
     values(p_actor,'polishing_member_managed',v_league,v_member,
       jsonb_build_object('operation',p_data->>'operation'));
   return jsonb_build_object('managed',true);
 elsif p_action='pending_evidence' then
   -- Evidence-only assessment of existing HOSTED pending requests. No writes,
   -- no interpretation of raw text, and no approval or point suggestion by default.
   if not (app_private.p7_is_owner(p_actor,v_league) or exists(
      select 1 from public.league_memberships m
      join app_private.league_review_delegations d on d.membership_id=m.id
      where m.league_id=v_league and m.user_id=p_actor
        and m.role='moderator' and m.left_at is null)) then
      raise exception 'Review delegation required' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(jsonb_build_object(
      'request_id',r.id,'submission_id',s.id,'game',s.game_id,
      'parse_status',s.parse_status,'identity_key',p.identity_key,
      'verification_state',p.verification_state,'reference_verified_at',p.verified_at,
      'original_sha256',encode(extensions.digest(convert_to(s.raw_share_text,'UTF8'),'sha256'),'hex'),
      'verified_day',
        case when p.verification_state='verified' then p.puzzle_day else null end,
      'submitted_at',s.submitted_at,'reviewer_independent',
        (r.requested_by is distinct from p_actor and s.account_id<>p_actor),
      'suggestion',case when p.verification_state='verified' and p.mode='daily' and p.puzzle_day is not null
          and s.parse_status='recognized_valid' then 'inspect_verified_evidence'
          else 'keep_pending_verify_source' end,
      'evidence','Stored puzzle verification only; independently check official source, league window, mode and eligibility')
      order by r.created_at)
    from app_private.approval_requests r
    join public.result_submissions s on s.id=r.submission_id
    left join public.game_puzzles p on p.id=s.puzzle_id
    where r.league_id=v_league and r.status='pending'),'[]'::jsonb);
 end if;
 raise exception 'Unknown protected operation' using errcode='22023';
end $$;
revoke all on function public.p7_polishing(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.p7_polishing(uuid,text,jsonb) to service_role;
revoke all on function app_private.p7_is_owner(uuid,uuid),app_private.p7_is_mod(uuid,uuid),
 app_private.p7_can(uuid,uuid,text) from public,anon,authenticated;
