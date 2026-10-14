-- Phase 3 final database regression. All inserted data rolls back.
-- Unlike the historical Block 1 test, this tests the CURRENT six-policy schema.
begin;

do $$
declare t text; v_id uuid := gen_random_uuid(); v_league uuid := gen_random_uuid();
        v_member uuid := gen_random_uuid(); v_mid uuid := gen_random_uuid();
        v_submission uuid := gen_random_uuid(); v_request uuid := gen_random_uuid();
        v_decision uuid := gen_random_uuid(); v_event bigint; v_failed boolean;
begin
  foreach t in array array['profiles','games','leagues','league_memberships','game_puzzles','result_submissions'] loop
    if to_regclass('public.'||t) is null or
      not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then
      raise exception 'Missing public RLS table %', t;
    end if;
    if has_table_privilege('anon','public.'||t,'INSERT') or
       has_table_privilege('authenticated','public.'||t,'UPDATE') or
       has_table_privilege('authenticated','public.'||t,'DELETE') then
       raise exception 'Public direct write privilege detected: %',t;
    end if;
  end loop;
  if (select count(*) from pg_policies where schemaname='public') <> 6 then
    raise exception 'Expected six named public RLS policies';
  end if;
  if exists (select 1 from pg_policies where schemaname='app_private') then
    raise exception 'Unexpected private client RLS policies';
  end if;
  foreach t in array array['approval_requests','approval_decisions','result_audit_events',
      'league_moderator_delegations'] loop
    if to_regclass('app_private.'||t) is null then raise exception 'Missing private table %',t; end if;
    if not (select relrowsecurity from pg_class where oid=('app_private.'||t)::regclass) then
      raise exception 'Private RLS missing on %',t;
    end if;
    if has_table_privilege('authenticated','app_private.'||t,'SELECT') or
       has_table_privilege('anon','app_private.'||t,'INSERT') then
       raise exception 'Private grants leaked on %',t;
    end if;
  end loop;
  if (select count(*) from public.games) <> 5 then
    raise exception 'Five-game catalog drift'; end if;
  if exists (select 1 from public.games where (id,approved_rule_version) not in (
    ('wordle','wordle-fixed-v1-approved'),
    ('minute_cryptic','minute-cryptic-hints-v1-approved'),
    ('foximax','foximax-original-n8-v1-approved'),
    ('polygonle','polygonle-standard-v1-approved'),
    ('krillion','krillion-daily-absolute700-v1-approved'))) then
    raise exception 'Approved scoring contract drift'; end if;
  if has_function_privilege('anon','app_private.record_security_event()','EXECUTE') or
     has_function_privilege('authenticated','app_private.record_security_event()','EXECUTE') then
     raise exception 'Audit helper leaked to clients'; end if;

  insert into auth.users (id,email) values
    (v_id,'phase3-audit-'||v_id||'@example.invalid'),
    (v_member,'phase3-audit-'||v_member||'@example.invalid');
  insert into public.leagues(id,owner_user_id,name,visibility,time_zone)
  values(v_league,v_id,'Phase3 rollback fixture','private','Africa/Johannesburg');
  insert into public.league_memberships(id,league_id,user_id)
  values (v_mid,v_league,v_member);
  update public.league_memberships set role='moderator' where id=v_mid;
  insert into app_private.league_moderator_delegations(membership_id,permission_name)
  values (v_mid,'view_member_roster');
  delete from app_private.league_moderator_delegations where membership_id=v_mid;
  if (select count(*) from app_private.result_audit_events
      where entity_id=v_mid and event_kind in ('membership_role_changed',
      'moderator_delegation_granted','moderator_delegation_revoked')) <> 3 then
    raise exception 'Role/delegation audit incomplete'; end if;

  insert into public.game_puzzles(game_id,mode,identity_key,verification_state)
  values ('wordle','daily','phase3-'||v_submission::text,'candidate');
  insert into public.result_submissions(id,account_id,raw_share_text,submission_method,
                                        game_id,parse_status)
  values (v_submission,v_member,'Wordle TEST ONLY', 'paste','wordle','needs_review');
  update public.result_submissions set parse_status='ambiguous' where id=v_submission;
  if (select count(*) from app_private.result_audit_events
      where submission_id=v_submission and event_kind in ('submission_created','submission_changed')) <> 2 then
    raise exception 'Submission audit missing'; end if;
  if exists (select 1 from app_private.result_audit_events
      where submission_id=v_submission and
      (previous_state::text ilike '%Wordle TEST%' or next_state::text ilike '%Wordle TEST%')) then
    raise exception 'Raw text leaked to security audit'; end if;
  v_failed := false;
  begin
    update public.result_submissions set raw_share_text='tampered' where id=v_submission;
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'Raw share was mutable'; end if;

  insert into app_private.approval_requests(id,submission_id,league_id,request_kind,
                                             requested_by,rationale)
  values (v_request,v_submission,v_league,'historical_exception',v_member,'test-only');
  v_failed := false;
  begin
    insert into app_private.approval_requests(submission_id,league_id,request_kind,rationale)
    values (v_submission,v_league,'historical_exception','duplicate');
  exception when unique_violation then v_failed := true; end;
  if not v_failed then raise exception 'Duplicate pending approval allowed'; end if;

  v_failed := false;
  begin update app_private.approval_requests set rationale='changed' where id=v_request;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Pending approval rationale mutable'; end if;
  v_failed := false;
  begin update app_private.approval_requests set status='approved',resolved_at=now() where id=v_request;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Unreviewed request resolved early'; end if;
  insert into app_private.approval_decisions(id,request_id,decided_by,decision,rationale)
  values (v_decision,v_request,v_id,'rejected','test-only rejection');
  update app_private.approval_requests set status='rejected',resolved_at=now()
  where id=v_request;
  v_failed := false;
  begin update app_private.approval_requests set status='approved',resolved_at=now() where id=v_request;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Resolved approval changed again'; end if;
  if (select count(*) from app_private.result_audit_events
     where submission_id=v_submission and event_kind in
     ('approval_requested','approval_decided','approval_request_changed')) <> 3 then
      raise exception 'Approval history event incomplete'; end if;
  v_failed := false;
  begin update app_private.approval_decisions set rationale='tampered' where id=v_decision;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Approval decision mutable'; end if;
  select id into v_event from app_private.result_audit_events where submission_id=v_submission limit 1;
  v_failed := false;
  begin delete from app_private.result_audit_events where id=v_event;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Audit history deletable'; end if;
  v_failed := false;
  begin delete from app_private.approval_requests where id=v_request;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'Approval request deletable'; end if;
  raise notice 'PASS: current schema, six public policies, approved scores, least privilege, immutable audit and approvals';
end;
$$;
rollback;
