-- Polishing identity: operator-verified, time-bounded sources ONLY.
-- Forward only; no historical submissions/awards mutated, no scoring versions touched.
-- Sources are installed by a trusted platform database operator, never via Edge or a league role.
create table app_private.p7_daily_reference (
 id bigint generated always as identity primary key,
 game_id text not null references public.games(id),
 identity_key text not null check (length(identity_key) between 1 and 64),
 puzzle_day date not null,
 mode text not null default 'daily' check(mode='daily'),
 game_mode text not null,
 source_kind text not null check(source_kind in ('official_game','official_archive','independently_crosschecked')),
 source_url text not null check(
   char_length(source_url) between 12 and 508
   and source_url ~ '^https://[^[:space:]]{4,}$'
 ),
 evidence_digest text not null check(evidence_digest ~ '^[0-9a-f]{64}$'),
 official_clue text,
 official_pattern text,
 observed_at timestamptz not null,
 valid_until timestamptz not null,
 created_at timestamptz not null default now(),
 check(valid_until>observed_at),
 check(valid_until <= observed_at+interval '96 hours'),
 unique(game_id,identity_key,puzzle_day)
);
create index p7_reference_lookup on app_private.p7_daily_reference(game_id,identity_key,valid_until);
alter table app_private.p7_daily_reference enable row level security;
revoke all on app_private.p7_daily_reference from public,anon,authenticated,service_role;
revoke all on sequence app_private.p7_daily_reference_id_seq from public,anon,authenticated,service_role;
create trigger p7_reference_immutable before update or delete on app_private.p7_daily_reference
 for each row execute function app_private.prevent_audit_history_mutation();

-- Operator records provenance AND establishes corresponding approved game_puzzles in one transaction.
-- Never callable by service_role, anon, authenticated, an owner or a moderator.
create function app_private.p7_register_daily_reference(
 p_game text,p_key text,p_day date,p_mode text,p_kind text,p_source_url text,
 p_digest text,p_observed_at timestamptz,p_valid_until timestamptz,
 p_clue text default null,p_pattern text default null)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_id bigint; v_game_mode text;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'Trusted database operator required' using errcode='42501';
 end if;
 if p_game not in ('wordle','minute_cryptic','foximax','polygonle','krillion')
    or p_key is null or length(p_key) not between 1 and 64
    or p_day is null or p_day>current_date+1
    or p_observed_at is null or p_observed_at > now()+interval '1 minute'
    or p_valid_until is null or p_valid_until<=now() or p_valid_until>p_observed_at+interval '96 hours'
    or p_source_url is null or char_length(p_source_url) not between 12 and 508
    or p_source_url !~ '^https://[^[:space:]]{4,}$'
    or p_digest !~ '^[0-9a-f]{64}$'
    or p_kind not in ('official_game','official_archive','independently_crosschecked') then
   raise exception 'Incomplete independent evidence' using errcode='22023';
 end if;
 v_game_mode:=case p_game when 'wordle' then 'published_number'
   when 'minute_cryptic' then 'published_date_clue'
   when 'foximax' then 'original_8'
   when 'polygonle' then 'standard_6to8'
   when 'krillion' then 'daily_dive' end;
 if p_mode is distinct from v_game_mode or
    (p_game='minute_cryptic' and (p_key<>p_day::text or length(btrim(coalesce(p_clue,'')))<4)) or
    (p_game='polygonle' and length(btrim(coalesce(p_pattern,'')))<4) or
    (p_game in ('wordle','foximax','polygonle','krillion') and p_key !~ '^[0-9]+$') then
   raise exception 'Game-specific source/mode verification required' using errcode='22023';
 end if;
 if exists(select 1 from public.game_puzzles p where p.game_id=p_game and p.identity_key=p_key
    and p.verification_state='verified' and p.puzzle_day is distinct from p_day) then
   raise exception 'Conflicting official puzzle day' using errcode='23505';
 end if;
 insert into app_private.p7_daily_reference(game_id,identity_key,puzzle_day,game_mode,
   source_kind,source_url,evidence_digest,official_clue,official_pattern,observed_at,valid_until)
 values(p_game,p_key,p_day,p_mode,p_kind,p_source_url,p_digest,p_clue,p_pattern,p_observed_at,p_valid_until)
 returning id into v_id;
 perform app_private.p4_operator_verify_puzzle(p_game,p_key,p_day,
   'Independently checked source reference #'||v_id::text||'; digest='||p_digest);
 insert into app_private.competition_events(action,details)
 values('trusted_daily_reference_registered',jsonb_build_object('reference_id',v_id,
   'game',p_game,'identity_key',p_key,'puzzle_day',p_day,'source_kind',p_kind));
 return v_id;
end $$;
revoke all on function app_private.p7_register_daily_reference(text,text,date,text,text,text,text,timestamptz,timestamptz,text,text)
 from public,anon,authenticated,service_role;

-- Edge may read evidence, not write it. Only an unexpired exact verified reference is returned.
create function public.p7_identity_reference(p_game text,p_key text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('game',r.game_id,'identity_key',r.identity_key,
   'puzzle_day',r.puzzle_day,'mode',r.mode,'game_mode',r.game_mode,
   'verification_state','verified','source_kind',r.source_kind,
   'source_url',r.source_url,'evidence_digest',r.evidence_digest,
   'observed_at',r.observed_at,'valid_until',r.valid_until,
   'official_clue',r.official_clue,'official_pattern',r.official_pattern)
 from app_private.p7_daily_reference r
 join public.game_puzzles p on p.game_id=r.game_id and p.identity_key=r.identity_key
   and p.mode='daily' and p.verification_state='verified' and p.puzzle_day=r.puzzle_day
 where r.game_id=p_game and r.identity_key=p_key and r.valid_until>now()
 order by r.observed_at desc limit 1;
$$;
revoke all on function public.p7_identity_reference(text,text) from public,anon,authenticated;
grant execute on function public.p7_identity_reference(text,text) to service_role;

-- Immutable diagnostics for NEW submission-time identity checks; never mutates shares or awards.
create function public.p7_log_identity_decision(p_actor uuid,p_submission uuid,p_game text,
 p_key text,p_outcome text,p_reason text,p_source_kind text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_actor is null or p_submission is null or not exists(
   select 1 from public.result_submissions s where s.id=p_submission and s.account_id=p_actor)
   or p_outcome not in ('reference_matched','pending_unverified')
   or length(coalesce(p_reason,'')) not between 2 and 100 then
   raise exception 'Invalid identity audit event' using errcode='42501';
 end if;
 insert into app_private.competition_events(actor_id,action,target_id,details)
 values(p_actor,'polishing_identity_decision',p_submission,
   jsonb_build_object('game',p_game,'identity_key',p_key,'decision',p_outcome,
     'reason',p_reason,'source_kind',p_source_kind));
end $$;
revoke all on function public.p7_log_identity_decision(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.p7_log_identity_decision(uuid,uuid,text,text,text,text,text) to service_role;

-- Reviewer evidence suggestions only: no automatic historical update or award.
-- Caller requires an active league owner or explicitly review-delegated moderator.
create function public.p7_pending_sources(p_actor uuid,p_league uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_actor is null or p_league is null or not(
   app_private.p7_is_owner(p_actor,p_league) or exists (
     select 1 from public.league_memberships m
     join app_private.league_review_delegations d on d.membership_id=m.id
     where m.league_id=p_league and m.user_id=p_actor
       and m.role='moderator' and m.left_at is null)) then
   raise exception 'Independent reviewer access required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'request_id',r.id,'submission_id',s.id,'game',s.game_id,
   'identity_key',p.identity_key,'parse_status',s.parse_status,
   'verification_state',p.verification_state,
   'verified_day',case when p.verification_state='verified' then p.puzzle_day else null end,
   'reviewer_independent',s.account_id<>p_actor and r.requested_by is distinct from p_actor,
   'suggestion',case when s.account_id=p_actor or r.requested_by=p_actor then 'independent_reviewer_required'
      when ref.id is null then 'keep_pending_verify_source'
      when p.mode<>'daily' or p.verification_state<>'verified' then 'keep_pending_verify_source'
      when s.game_id='minute_cryptic' and lower(btrim(coalesce(s.parsed_fields->>'clue','')))
          <> lower(btrim(coalesce(ref.official_clue,''))) then 'keep_pending_clue_conflict'
      when s.game_id='foximax' and (ref.game_mode<>'original_8'
          or s.parsed_fields->>'fraction_denominator'<>'8') then 'keep_pending_mode_conflict'
      when s.game_id='polygonle' and (ref.game_mode<>'standard_6to8'
          or s.parsed_fields->>'attempt_limit_displayed'<>'6'
          or ref.official_pattern is distinct from s.parsed_fields->>'pattern_header_raw')
          then 'keep_pending_mode_conflict'
      when s.game_id='krillion' and ref.game_mode<>'daily_dive' then 'keep_pending_mode_conflict'
      when s.parse_status not in ('recognized_valid','needs_review') then 'keep_pending_parse_conflict'
      else 'review_official_evidence_no_auto_award' end,
   'evidence',case when ref.id is null then 'No current independently verified reference'
      else 'Independent source reference available; check all league rules and original share manually' end,
   'reference_source_kind',ref.source_kind,'reference_digest',ref.evidence_digest,
   'original_sha256',encode(extensions.digest(convert_to(s.raw_share_text,'UTF8'),'sha256'),'hex'))
   order by r.created_at)
 from app_private.approval_requests r
 join public.result_submissions s on s.id=r.submission_id
 left join public.game_puzzles p on p.id=s.puzzle_id
 left join lateral (select x.* from app_private.p7_daily_reference x
   where x.game_id=s.game_id and x.identity_key=p.identity_key
     and x.puzzle_day=p.puzzle_day and x.valid_until>now()
     order by x.observed_at desc limit 1) ref on true
 where r.league_id=p_league and r.status='pending'),'[]'::jsonb);
end $$;
revoke all on function public.p7_pending_sources(uuid,uuid) from public,anon,authenticated;
grant execute on function public.p7_pending_sources(uuid,uuid) to service_role;
