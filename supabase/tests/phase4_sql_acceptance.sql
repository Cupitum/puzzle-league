-- Phase 4 local PostgreSQL assertions. Entire suite is ONE rolled-back transaction.
-- Synthetic fixtures do not become real users, puzzle verification or awarded points.
begin;
do $$
declare o uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); w uuid:=gen_random_uuid();
 l uuid; s uuid; inv uuid; sub uuid; second_sub uuid; r uuid; fresh uuid;
 j jsonb; n integer; today_local date :=(now() at time zone 'Africa/Johannesburg')::date;
begin
 insert into auth.users(id,email) values(o, 'p4-'||o||'@example.invalid'),
 (m,'p4-'||m||'@example.invalid'),(w,'p4-'||w||'@example.invalid');
 if (select count(*) from public.profiles where id in (o,m,w))<>3 then raise exception 'Auth/profile missing'; end if;
 -- Database is authoritative for approved performance, independent of Edge preview.
 if app_private.p4_points('wordle','{"attempts":6,"completed_failure":false}'::jsonb)<>1
    or app_private.p4_points('wordle','{"completed_failure":true,"attempts":null}'::jsonb)<>0
    or app_private.p4_points('minute_cryptic','{"hints_used":0}'::jsonb)<>10
    or app_private.p4_points('minute_cryptic','{"hints_used":12}'::jsonb)<>0
    or app_private.p4_points('foximax','{"fraction_denominator":8,"fraction_numerator":8,"completed_failure":false}'::jsonb)<>1
    or app_private.p4_points('polygonle','{"attempt_limit_displayed":6,"word_length_observed":7,"attempts":3,"completed_failure":false}'::jsonb)<>6
    or app_private.p4_points('krillion','{"reported_number":440}'::jsonb)<>6
    or app_private.p4_points('krillion','{"reported_number":700}'::jsonb)<>10
   then raise exception 'Approved five-game SQL performance rule mismatch'; end if;
 if has_function_privilege('anon','public.p4_dispatch(uuid,text,jsonb)','execute')
    or has_function_privilege('authenticated','public.p4_dispatch(uuid,text,jsonb)','execute')
    or not has_function_privilege('service_role','public.p4_dispatch(uuid,text,jsonb)','execute')
    then raise exception 'RPC service-role boundary violation'; end if;
 if has_table_privilege('authenticated','public.league_score_entries','insert')
    or has_table_privilege('anon','public.league_seasons','select') then
       raise exception 'Direct data grant leak'; end if;
 j:=public.p4_dispatch(o,'create_league',jsonb_build_object('name','P4 fixture league',
    'visibility','private','time_zone','Africa/Johannesburg'));
 l:=(j->>'league_id')::uuid;
 begin
   perform public.p4_dispatch(m,'join',jsonb_build_object('league_id',l));
   raise exception 'Private league joined without invite';
 exception when insufficient_privilege then null;
 end;
 j:=public.p4_dispatch(o,'invite',jsonb_build_object('league_id',l));
 inv:=(j->>'invite_token')::uuid;
 perform public.p4_dispatch(m,'join',jsonb_build_object('invite_token',inv));
 begin
   perform public.p4_dispatch(w,'join',jsonb_build_object('invite_token',inv));
   raise exception 'Used invitation was accepted';
 exception when others then
   if sqlerrm='Used invitation was accepted' then raise; end if;
 end;
 j:=public.p4_dispatch(o,'start_season',jsonb_build_object('league_id',l,
    'cadence','calendar_month','games',jsonb_build_array('wordle','minute_cryptic','foximax','polygonle','krillion')));
 s:=(j->>'season_id')::uuid;
 if (select count(*) from public.season_game_settings where season_id=s)<>5
     then raise exception 'Incomplete season game snapshots'; end if;
 if (select rule_version from public.season_game_settings where season_id=s and game_id='wordle')
     <>'wordle-fixed-v1-approved' then raise exception 'Rule version changed'; end if;

 -- Isolated operator-only verified fixture, never a claim about real Wordle #999888.
 perform app_private.p4_operator_verify_puzzle('wordle','999888',today_local,
    'Synthetic rollback-only acceptance fixture reference');
 j:=public.p4_dispatch(m,'submit',jsonb_build_object('raw_text','Wordle 999888 1/6','game','wordle',
   'identity_key','999888','status','recognized_valid','parser_version','p4-test-harness',
   'method','paste','fields',jsonb_build_object('attempts',1,'completed_failure',false)));
 sub:=(j->>'submission_id')::uuid;
 if j->>'awarded'<>'1' or (select performance_points from public.league_score_entries
     where submission_id=sub)<>10 then raise exception 'Accepted score does not equal 10+1'; end if;
 j:=public.p4_dispatch(m,'submit',jsonb_build_object('raw_text','Wordle 999888 1/6','game','wordle',
   'identity_key','999888','status','recognized_valid','parser_version','p4-test-harness',
   'method','paste','fields',jsonb_build_object('attempts',1,'completed_failure',false)));
 if j->>'duplicate'<>'true' then raise exception 'Duplicate result awarded'; end if;

 -- Candidate identity stays non-awarding until operator verification and independent review.
 j:=public.p4_dispatch(m,'submit',jsonb_build_object('raw_text','Wordle 999889 6/6','game','wordle',
   'identity_key','999889','status','recognized_valid','parser_version','p4-test-harness',
   'method','paste','fields',jsonb_build_object('attempts',6,'completed_failure',false)));
 second_sub:=(j->>'submission_id')::uuid;
 if j->>'awarded'<>'0' or (select review_status from public.result_submissions where id=second_sub)<>'pending'
    then raise exception 'Unverified result paid early'; end if;
 select id into r from app_private.approval_requests where submission_id=second_sub and league_id=l;
 if r is null then raise exception 'No moderator review request'; end if;
 begin
   perform public.p4_dispatch(m,'review',jsonb_build_object('request_id',r,'decision','approved','rationale','own result'));
   raise exception 'Self review succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.p4_dispatch(o,'review',jsonb_build_object('request_id',r,'decision','approved','rationale','checked'));
   raise exception 'Unverified result approved';
 exception when others then
   if sqlerrm='Unverified result approved' then raise; end if;
 end;
 perform app_private.p4_operator_verify_puzzle('wordle','999889',today_local,
    'Synthetic rollback-only acceptance fixture reference');
 j:=public.p4_dispatch(o,'review',jsonb_build_object('request_id',r,'decision','approved',
    'rationale','Synthetic operator puzzle proof confirmed'));
 if j->>'new_awards'<>'1' or (select performance_points from public.league_score_entries
   where submission_id=second_sub)<>1 then raise exception 'Approved result not scored per 6/6 rule'; end if;

 -- Owner moderation can remove, suspend and re-admit without resetting uniqueness.
 perform public.p4_dispatch(o,'suspend_member',jsonb_build_object('league_id',l,
   'member_id',m,'reason','Synthetic local suspension assertion'));
 if not exists(select 1 from app_private.league_suspensions where league_id=l and user_id=m and active)
    then raise exception 'Suspension not recorded'; end if;
 j:=public.p4_dispatch(o,'invite',jsonb_build_object('league_id',l));
 inv:=(j->>'invite_token')::uuid;
 begin
   perform public.p4_dispatch(m,'join',jsonb_build_object('invite_token',inv));
   raise exception 'Suspended member was re-admitted';
 exception when insufficient_privilege then null;
 end;
 perform public.p4_dispatch(o,'unsuspend_member',jsonb_build_object('league_id',l,'member_id',m));
 perform public.p4_dispatch(m,'join',jsonb_build_object('invite_token',inv));
 if (select count(*) from public.league_memberships where league_id=l and user_id=m)<>2
   then raise exception 'Leave/rejoin history lost'; end if;
 -- Schedule an approved game-list change; original snapshot must remain untouched.
 perform public.p4_dispatch(o,'schedule_games',jsonb_build_object('league_id',l,
   'target_sequence',2,'games',jsonb_build_array('wordle','krillion')));
 -- Non-destructive, idempotent two-season rollover with frozen selections.
 perform app_private.p4_tick((select ends_at from public.league_seasons where id=s)+interval '1 second');
 if (select count(*) from public.league_seasons where league_id=l)<>2 then
   raise exception 'Season renewal failed'; end if;
 perform app_private.p4_tick((select ends_at from public.league_seasons where id=s)+interval '1 second');
 if (select count(*) from public.league_seasons where league_id=l)<>2 then
   raise exception 'Season renewed twice'; end if;
 if (select count(*) from public.season_game_settings ss join public.league_seasons ls on ls.id=ss.season_id
    where ls.league_id=l and ls.sequence_no=2)<>2 then raise exception 'Scheduled change not applied to season 2'; end if;
 raise notice 'PHASE 4 SQL: PASS — roles, invite, seasons, uniqueness, 1/6 and 6/6, safe review, rollover';
end $$;
rollback;
