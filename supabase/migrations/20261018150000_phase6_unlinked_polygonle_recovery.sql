-- Phase 6 / forward-only. Recovery ONLY for the three historical, unlinked
-- Polygonle #1539 parser-ambiguous rows. This function never links puzzles,
-- marks a puzzle verified, resolves moderation, or modifies any award.
-- Migration 12's existing guarded reparse function remains unchanged.
create function app_private.p6_reparse_unlinked_polygonle(
 p_submission uuid, p_expected_sha256 text, p_expected_parser text,
 p_expected_fields jsonb, p_new_parser text, p_new_fields jsonb,
 p_operator_label text, p_reason text, p_evidence_uri text
) returns bigint language plpgsql security invoker set search_path='' as $$
declare v_old public.result_submissions%rowtype; v_id bigint;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'Administrative DB session required' using errcode='42501';
 end if;
 select * into strict v_old from public.result_submissions where id=p_submission for update;
 if v_old.game_id <> 'polygonle' or v_old.puzzle_id is not null
    or v_old.review_status <> 'pending' or v_old.parse_status <> 'ambiguous' then
   raise exception 'Only unlinked pending ambiguous Polygonle submissions are eligible';
 end if;
 if exists (select 1 from public.league_score_entries where submission_id=p_submission) then
   raise exception 'Award history present: correction workflow required';
 end if;
 if exists (select 1 from app_private.approval_decisions d
   join app_private.approval_requests r on r.id=d.request_id
   where r.submission_id=p_submission) then
   raise exception 'Prior review decision exists';
 end if;
 if exists (select 1 from app_private.p6_pending_reparse_events where submission_id=p_submission) then
   raise exception 'Already reprocessed; repeated interpretation forbidden';
 end if;
 if v_old.parser_version is distinct from p_expected_parser
    or v_old.parsed_fields is distinct from p_expected_fields
    or encode(extensions.digest(convert_to(v_old.raw_share_text,'UTF8'),'sha256'),'hex') <> lower(p_expected_sha256) then
   raise exception 'Stale source/parser/fields: abort';
 end if;
 if p_new_parser <> 'p4-1.0.0' or p_new_fields is null
    or jsonb_typeof(p_new_fields) is distinct from 'object'
    or p_new_fields->>'puzzle_number' is distinct from '1539'
    or p_new_fields->>'attempt_limit_displayed' is distinct from '6'
    or p_new_fields->'puzzle_date' is distinct from 'null'::jsonb
    or coalesce(p_new_fields->>'word_length_observed','') not in ('6','7','8')
    or coalesce(p_new_fields->>'completed_failure','') not in ('true','false')
    or jsonb_typeof(p_new_fields->'grid') is distinct from 'array'
    or coalesce(p_new_fields->>'pattern_header_raw','') = ''
    or length(btrim(coalesce(p_operator_label,''))) not between 3 and 120
    or length(btrim(coalesce(p_reason,''))) not between 12 and 2000
    or length(btrim(coalesce(p_evidence_uri,''))) not between 12 and 2000 then
   raise exception 'Invalid or unverified parser-only candidate';
 end if;
 -- The caller independently runs the pinned source parser against raw text.
 -- NO puzzle_id, date/mode, review_status, rules or scores are modified.
 update public.result_submissions
 set parser_version=p_new_parser, parse_status='needs_review', parsed_fields=p_new_fields
 where id=p_submission;
 insert into app_private.p6_pending_reparse_events(
   submission_id,operator_label,reason,evidence_uri,before_parser,after_parser,
   before_status,after_status,before_fields,after_fields,raw_sha256)
 values (p_submission,p_operator_label,p_reason,p_evidence_uri,v_old.parser_version,
         p_new_parser,v_old.parse_status,'needs_review',v_old.parsed_fields,
         p_new_fields,lower(p_expected_sha256)) returning id into v_id;
 insert into app_private.competition_events(action,target_id,details)
 values ('phase6_pending_reparsed',p_submission,
         jsonb_build_object('reparse_event_id',v_id,'operator',p_operator_label,
           'scope','unlinked-polygonle-1539-parser-only'));
 return v_id;
end $$;
revoke all on function app_private.p6_reparse_unlinked_polygonle(
  uuid,text,text,jsonb,text,jsonb,text,text,text) from public,anon,authenticated;
