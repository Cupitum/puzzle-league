-- Phase 6: a deliberately admin-only, no-awards pending parser reinterpretation.
-- Never rewrite originals, puzzle IDs, awards, approval decisions or scoring versions.
create table app_private.p6_pending_reparse_events (
 id bigint generated always as identity primary key,
 submission_id uuid not null references public.result_submissions(id),
 operator_label text not null check(length(btrim(operator_label)) between 3 and 120),
 reason text not null check(length(btrim(reason)) between 12 and 2000),
 evidence_uri text not null check(length(btrim(evidence_uri)) between 12 and 2000),
 before_parser text,
 after_parser text not null,
 before_status text not null,
 after_status text not null,
 before_fields jsonb,
 after_fields jsonb not null,
 raw_sha256 text not null,
 occurred_at timestamptz not null default clock_timestamp()
);
alter table app_private.p6_pending_reparse_events enable row level security;
revoke all on app_private.p6_pending_reparse_events from public,anon,authenticated;
create trigger p6_reparse_events_immutable before update or delete on app_private.p6_pending_reparse_events
 for each row execute function app_private.prevent_audit_history_mutation();

create function app_private.p6_reparse_pending(
 p_submission uuid, p_expected_sha256 text, p_expected_parser text,
 p_new_parser text, p_new_status text, p_new_fields jsonb,
 p_operator_label text, p_reason text, p_evidence_uri text)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_old public.result_submissions%rowtype; v_id bigint;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'Administrative DB session required' using errcode='42501';
 end if;
 select * into strict v_old from public.result_submissions where id=p_submission for update;
 if v_old.review_status <> 'pending' or v_old.game_id is null or v_old.puzzle_id is null then
   raise exception 'Only identified pending submissions can be reinterpreted';
 end if;
 if exists (select 1 from public.league_score_entries where submission_id=p_submission) then
   raise exception 'Award history present: correction workflow required';
 end if;
 if exists (select 1 from app_private.approval_decisions d join app_private.approval_requests r
   on r.id=d.request_id where r.submission_id=p_submission) then
   raise exception 'Review decision exists: manual correction workflow required';
 end if;
 if v_old.parser_version is distinct from p_expected_parser or
    encode(extensions.digest(convert_to(v_old.raw_share_text,'UTF8'),'sha256'),'hex') <> lower(p_expected_sha256)
 then raise exception 'Stale source/parser: abort'; end if;
 if p_new_parser not like 'p4-%' or p_new_status not in ('recognized_valid','needs_review')
    or jsonb_typeof(p_new_fields) <> 'object'
    or length(btrim(coalesce(p_operator_label,''))) not between 3 and 120
    or length(btrim(coalesce(p_reason,''))) not between 12 and 2000
    or length(btrim(coalesce(p_evidence_uri,''))) not between 12 and 2000
 then raise exception 'Invalid audited reparse inputs'; end if;
 -- Operator MUST verify candidate source-derived fields against original text.
 -- Date/mode/puzzle reference cannot change through this function.
 update public.result_submissions set parser_version=p_new_parser,
   parse_status=p_new_status, parsed_fields=p_new_fields where id=p_submission;
 insert into app_private.p6_pending_reparse_events(
   submission_id,operator_label,reason,evidence_uri,before_parser,after_parser,
   before_status,after_status,before_fields,after_fields,raw_sha256)
 values (p_submission,p_operator_label,p_reason,p_evidence_uri,v_old.parser_version,
 p_new_parser,v_old.parse_status,p_new_status,v_old.parsed_fields,p_new_fields,
 lower(p_expected_sha256)) returning id into v_id;
 insert into app_private.competition_events(action,target_id,details)
 values ('phase6_pending_reparsed',p_submission,jsonb_build_object('reparse_event_id',v_id,'operator',p_operator_label));
 return v_id;
end $$;
revoke all on function app_private.p6_reparse_pending(uuid,text,text,text,text,jsonb,text,text,text) from public,anon,authenticated;
