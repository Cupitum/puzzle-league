-- Phase 3 consolidated completion: infrastructure only; no scoring/acceptance API.
-- Forward-only. Requires 20261013220200. Never amend applied migrations.
-- app_private must NOT be an exposed PostgREST schema.

create table app_private.approval_requests (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.result_submissions(id),
    league_id uuid references public.leagues(id),
    request_kind text not null check (request_kind in
        ('submission_review', 'historical_exception', 'score_correction')),
    requested_by uuid references public.profiles(id),
    rationale text not null check (length(btrim(rationale)) between 1 and 2000),
    status text not null default 'pending' check
        (status in ('pending', 'approved', 'rejected', 'withdrawn')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    constraint approval_request_resolution_consistency check (
       (status = 'pending' and resolved_at is null) or
       (status <> 'pending' and resolved_at is not null)
    ),
    constraint approval_request_historical_scope check
       (request_kind <> 'historical_exception' or league_id is not null)
);
create unique index approval_requests_one_pending_scope
    on app_private.approval_requests (
        submission_id, request_kind, coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) where status = 'pending';
create index approval_requests_pending_idx on app_private.approval_requests(status, created_at);

create table app_private.approval_decisions (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null unique references app_private.approval_requests(id),
    decided_by uuid not null references public.profiles(id),
    decision text not null check (decision in ('approved', 'rejected', 'withdrawn')),
    rationale text not null check (length(btrim(rationale)) between 1 and 2000),
    created_at timestamptz not null default now()
);

-- A request is born pending and can transition exactly once. Every resolution
-- must be backed by an already-inserted immutable decision in the same transaction.
-- The real API must additionally enforce independent reviewer/owner policy.
create function app_private.guard_approval_request_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
    if tg_op='INSERT' then
        if new.status <> 'pending' or new.resolved_at is not null then
            raise exception 'Requests must begin pending' using errcode='22023';
        end if;
        return new;
    end if;
    if new.id is distinct from old.id
       or new.submission_id is distinct from old.submission_id
       or new.league_id is distinct from old.league_id
       or new.request_kind is distinct from old.request_kind
       or new.requested_by is distinct from old.requested_by
       or new.rationale is distinct from old.rationale
       or new.created_at is distinct from old.created_at then
        raise exception 'Approval request evidence is immutable' using errcode='42501';
    end if;
    if old.status <> 'pending' or new.status = 'pending'
       or new.resolved_at is null or not exists (
           select 1 from app_private.approval_decisions d
           where d.request_id = old.id and d.decision = new.status
       ) then
        raise exception 'Resolution requires a matching immutable decision' using errcode='42501';
    end if;
    return new;
end;
$$;
create trigger approval_requests_status_guard
  before insert or update on app_private.approval_requests
  for each row execute function app_private.guard_approval_request_transition();

create function app_private.guard_approval_decision_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
    if not exists (select 1 from app_private.approval_requests r
                   where r.id = new.request_id and r.status = 'pending') then
        raise exception 'Cannot decide a non-pending approval' using errcode='42501';
    end if;
    return new;
end;
$$;
create trigger approval_decisions_status_guard
  before insert on app_private.approval_decisions
  for each row execute function app_private.guard_approval_decision_insert();

-- No email or raw share body in event payloads. Actor is nullable for a trusted
-- DB operation without end-user JWT; actor_role records that distinction.
create table app_private.result_audit_events (
    id bigint generated always as identity primary key,
    occurred_at timestamptz not null default clock_timestamp(),
    actor_user_id uuid,
    actor_role text not null,
    event_kind text not null check (event_kind in (
        'submission_created', 'submission_changed', 'submission_deleted',
        'membership_role_changed', 'moderator_delegation_granted',
        'moderator_delegation_revoked', 'approval_requested',
        'approval_request_changed', 'approval_decided'
    )),
    entity_type text not null check (entity_type in (
        'result_submission', 'league_membership', 'moderator_delegation',
        'approval_request', 'approval_decision'
    )),
    entity_id uuid not null,
    league_id uuid,
    submission_id uuid,
    previous_state jsonb,
    next_state jsonb,
    constraint audit_state_json_objects check (
      (previous_state is null or jsonb_typeof(previous_state)='object')
      and (next_state is null or jsonb_typeof(next_state)='object')
    )
);
create index result_audit_events_subject_idx
    on app_private.result_audit_events(entity_type, entity_id, occurred_at);
create index result_audit_events_submission_idx
    on app_private.result_audit_events(submission_id, occurred_at);

-- Append-only for decisions and event records, even if accessed through a
-- privileged application function. Database superusers retain break-glass power.
create function app_private.prevent_audit_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
    raise exception 'Immutable approval decision/audit history cannot be modified'
      using errcode = '42501';
end;
$$;
create trigger approval_decisions_immutable
  before update or delete on app_private.approval_decisions
  for each row execute function app_private.prevent_audit_history_mutation();
create trigger result_audit_events_immutable
  before update or delete on app_private.result_audit_events
  for each row execute function app_private.prevent_audit_history_mutation();

-- Preserve precise events for submission/role/delegation/approval mutations;
-- never store raw text, parsed_fields, email, signup metadata or passwords.
create function app_private.record_security_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_entity_id uuid;
    v_event text;
    v_entity_type text;
    v_league uuid;
    v_submission uuid;
    v_old jsonb;
    v_new jsonb;
    v_actor uuid;
    v_role text;
begin
    v_actor := auth.uid();
    v_role := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
               nullif(current_setting('role', true), 'none'), 'database_admin');
    if tg_table_schema='public' and tg_table_name='result_submissions' then
        v_entity_type := 'result_submission';
        v_entity_id := case when tg_op='DELETE' then old.id else new.id end;
        v_submission := v_entity_id;
        v_event := case tg_op when 'INSERT' then 'submission_created'
                  when 'UPDATE' then 'submission_changed' else 'submission_deleted' end;
        if tg_op <> 'INSERT' then
          v_old := jsonb_build_object('account_id',old.account_id,'game_id',old.game_id,
             'puzzle_id',old.puzzle_id,'parse_status',old.parse_status,
             'parser_version',old.parser_version,'review_status',old.review_status);
        end if;
        if tg_op <> 'DELETE' then
          v_new := jsonb_build_object('account_id',new.account_id,'game_id',new.game_id,
             'puzzle_id',new.puzzle_id,'parse_status',new.parse_status,
             'parser_version',new.parser_version,'review_status',new.review_status);
        end if;
    elsif tg_table_schema='public' and tg_table_name='league_memberships' then
        if tg_op <> 'UPDATE' or old.role is not distinct from new.role then
          return new;
        end if;
        v_entity_type := 'league_membership';
        v_entity_id := new.id;
        v_league := new.league_id;
        v_event := 'membership_role_changed';
        v_old := jsonb_build_object('role',old.role);
        v_new := jsonb_build_object('role',new.role);
    elsif tg_table_schema='app_private' and tg_table_name='league_moderator_delegations' then
        v_entity_type := 'moderator_delegation';
        v_entity_id := case tg_op when 'DELETE' then old.membership_id else new.membership_id end;
        select league_id into v_league from public.league_memberships where id=v_entity_id;
        v_event := case tg_op when 'INSERT' then 'moderator_delegation_granted'
                   else 'moderator_delegation_revoked' end;
        if tg_op='DELETE' then
           v_old := jsonb_build_object('permission',old.permission_name);
        else
           v_new := jsonb_build_object('permission',new.permission_name);
        end if;
    elsif tg_table_schema='app_private' and tg_table_name='approval_requests' then
        v_entity_type := 'approval_request';
        v_entity_id := case tg_op when 'INSERT' then new.id else old.id end;
        v_submission := case tg_op when 'INSERT' then new.submission_id else old.submission_id end;
        v_league := case tg_op when 'INSERT' then new.league_id else old.league_id end;
        v_event := case tg_op when 'INSERT' then 'approval_requested' else 'approval_request_changed' end;
        if tg_op='UPDATE' then
           v_old := jsonb_build_object('kind',old.request_kind,'status',old.status);
        end if;
        v_new := jsonb_build_object('kind',new.request_kind,'status',new.status);
    elsif tg_table_schema='app_private' and tg_table_name='approval_decisions' then
        v_entity_type := 'approval_decision';
        v_entity_id := new.id;
        select submission_id, league_id into v_submission, v_league
          from app_private.approval_requests where id=new.request_id;
        v_event := 'approval_decided';
        v_actor := new.decided_by;
        v_new := jsonb_build_object('request_id',new.request_id,'decision',new.decision);
    else
        raise exception 'Unexpected audit trigger target' using errcode='22023';
    end if;
    insert into app_private.result_audit_events (
        actor_user_id, actor_role, event_kind, entity_type, entity_id,
        league_id, submission_id, previous_state, next_state
    ) values (v_actor, v_role, v_event, v_entity_type, v_entity_id,
        v_league, v_submission, v_old, v_new);
    if tg_op='DELETE' then return old; end if;
    return new;
end;
$$;

create trigger submissions_audit
  after insert or update or delete on public.result_submissions
  for each row execute function app_private.record_security_event();
create trigger memberships_role_audit
  after update of role on public.league_memberships
  for each row execute function app_private.record_security_event();
create trigger moderator_delegations_audit
  after insert or delete on app_private.league_moderator_delegations
  for each row execute function app_private.record_security_event();
create trigger approval_requests_audit
  after insert or update on app_private.approval_requests
  for each row execute function app_private.record_security_event();
create trigger approval_decisions_audit
  after insert on app_private.approval_decisions
  for each row execute function app_private.record_security_event();

-- No submitted approvals yet: review decision writes and self-approval conflict
-- resolution belong to the trusted Phase 4 moderation engine, NOT this migration.
-- Approval requests may not be deleted once written: preserve the history.
create function app_private.prevent_approval_request_delete()
returns trigger language plpgsql set search_path='' as $$
begin
    raise exception 'Approval requests cannot be deleted; use an audited status transition'
       using errcode='42501';
end;
$$;
create trigger approval_requests_no_delete
  before delete on app_private.approval_requests
  for each row execute function app_private.prevent_approval_request_delete();

alter table app_private.approval_requests enable row level security;
alter table app_private.approval_decisions enable row level security;
alter table app_private.result_audit_events enable row level security;
revoke all on table app_private.approval_requests,
   app_private.approval_decisions, app_private.result_audit_events
   from public, anon, authenticated;
revoke all on sequence app_private.result_audit_events_id_seq
   from public, anon, authenticated;
revoke all on function app_private.prevent_audit_history_mutation(),
    app_private.record_security_event(),
    app_private.prevent_approval_request_delete(),
    app_private.guard_approval_request_transition(),
    app_private.guard_approval_decision_insert()
   from public, anon, authenticated;
-- Lock down all trigger-related helpers (existing ones remain unchanged).
-- The exposed public moderator wrappers remain callable by authenticated users,
-- but the underlying owner check and audit triggers enforce the boundary.
