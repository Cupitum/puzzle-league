-- Puzzle League P9: owner-approved daily date-counter identity for FIVE games.
-- Forward-only migration #18; untouched previous 17 migrations and saved share/award data.
-- Source: supplied Git archive 45fd682 (P8 feature commit), 25 October 2026.
-- No retrospective approval/backfill and no source-provenance fabrication.

-- Derive calendar date from a trusted hardcoded game counter.
-- Invalid, extreme, future or nonnumeric identifiers cannot be certified.
create function app_private.p9_day_from_key(p_game text, p_key text)
returns date language plpgsql stable set search_path='' as $$
declare v_number numeric; v_anchor integer; v_day date;
begin
 if p_game='minute_cryptic' then
   if p_key is null or p_key !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
   begin
     v_day:=p_key::date;
     if v_day::text<>p_key then return null; end if;
   exception when others then return null; end;
 else
   v_anchor:=case p_game when 'wordle' then 1954 when 'foximax' then 1520
       when 'krillion' then 102 when 'polygonle' then 1547 else null end;
   if v_anchor is null or p_key is null or p_key !~ '^[0-9]{1,10}$' then return null; end if;
   v_number:=p_key::numeric;
   if v_number<1 or v_number>200000 then return null; end if;
   v_day:=date '2026-10-25' + (v_number::integer - v_anchor);
 end if;
 if v_day < date '2021-06-19' or v_day>current_date+1 then return null; end if;
 return v_day;
end $$;
revoke all on function app_private.p9_day_from_key(text,text) from public,anon,authenticated,service_role;

-- UTC-minus-local minutes, as emitted by JS Date#getTimezoneOffset.
-- The server clock is the authority; no dependence on an untrusted device clock.
create function app_private.p9_local_today(p_offset integer,p_at timestamptz default now())
returns date language sql stable set search_path='' as $$
 select case when p_offset between -840 and 720 and mod(p_offset,15)=0 then
   ((p_at - make_interval(mins=>p_offset)) at time zone 'UTC')::date
   else null::date end
$$;
revoke all on function app_private.p9_local_today(integer,timestamptz) from public,anon,authenticated,service_role;

-- Preserve all P8 dispatcher behavior; replace ONLY the submit path by explicit
-- date-derived verification and fail-closed historical moderation handling.
create or replace function public.p4_dispatch(p_actor uuid,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_league uuid; v_season uuid; v_id uuid; v_user uuid; v_token uuid; v_request uuid;
 v_role text; v_status text; v_game text; v_key text; v_mode text; v_parser text;
 v_fields jsonb; v_raw text; v_date date; v_verified text; v_account uuid;
 v_puzzle uuid; v_submission uuid; v_points integer; v_count integer; v_tz text;
 v_cadence text; v_start timestamptz; v_seq integer; v_days integer; v_games text[];
 v_inv app_private.league_invitations%rowtype; v_req app_private.approval_requests%rowtype;
 v_sub public.result_submissions%rowtype; v_puz public.game_puzzles%rowtype;
 v_now timestamptz:=now(); v_current integer; v_corr app_private.result_corrections%rowtype;
 v_oldpoints integer;
 v_day_from_key date; v_server_local_day date; v_offset integer;
 v_date_identity boolean:=false; v_score_valid boolean:=false; v_existing_day date;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_action)>80 then
   raise exception 'Bad request' using errcode='22023'; end if;
 if p_action='standings' then
   return app_private.p4_standings(p_actor,(p_data->>'season_id')::uuid);
 end if;
 if p_actor is null or not exists(select 1 from public.profiles where id=p_actor) then
   raise exception 'Authenticated profile required' using errcode='42501'; end if;
 -- P8: verified email is a trusted server-side prerequisite for league creation.
 if p_action='create_league' and not app_private.p8_is_email_verified(p_actor) then
   raise exception 'Verify your email before creating a league' using errcode='42501';
 end if;

 if p_action='update_profile' then
   if length(btrim(coalesce(p_data->>'nickname',''))) not between 1 and 40
      then raise exception 'Nickname must be 1-40 characters'; end if;
   update public.profiles set nickname=btrim(p_data->>'nickname'),updated_at=now()
     where id=p_actor;
   insert into app_private.competition_events(actor_id,action,target_id)
     values(p_actor,'nickname_updated',p_actor);
   return jsonb_build_object('nickname',btrim(p_data->>'nickname'));

 elsif p_action='my_leagues' then
   return coalesce((select jsonb_agg(jsonb_build_object('league_id',l.id,'name',l.name,
      'visibility',l.visibility,'time_zone',l.time_zone,'is_owner',l.owner_user_id=p_actor)
      order by l.name) from public.leagues l where l.owner_user_id=p_actor or exists(
       select 1 from public.league_memberships m
       where m.league_id=l.id and m.user_id=p_actor and m.left_at is null)),'[]'::jsonb);

 elsif p_action='season_list' then
   v_league:=(p_data->>'league_id')::uuid;
   if not exists(select 1 from public.leagues l where l.id=v_league and
      (l.visibility='public' or l.owner_user_id=p_actor or exists(
       select 1 from public.league_memberships m where m.league_id=l.id and m.user_id=p_actor and m.left_at is null)))
     then raise exception 'Private league access denied' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(jsonb_build_object('season_id',s.id,
     'sequence_no',s.sequence_no,'cadence',s.cadence,'starts_at',s.starts_at,
     'ends_at',s.ends_at,'state',s.state,'games',(
       select jsonb_agg(jsonb_build_object('game',g.game_id,'rule_version',g.rule_version)
         order by g.game_id) from public.season_game_settings g where g.season_id=s.id))
       order by s.sequence_no) from public.league_seasons s where s.league_id=v_league),'[]'::jsonb);

 elsif p_action='review_queue' then
   v_league:=(p_data->>'league_id')::uuid;
   if not app_private.p4_authorized(p_actor,v_league,true)
     then raise exception 'Review queue access denied' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(jsonb_build_object('request_id',r.id,
     'submission_id',s.id,'kind',r.request_kind,'submitted_at',s.submitted_at,
     'game',s.game_id,'parse_status',s.parse_status,'review_status',s.review_status,
     'raw_text',s.raw_share_text,'parsed_fields',s.parsed_fields,'rationale',r.rationale,
     'correction_proposed_text',c.replacement_raw_text,
     'correction_fields',c.replacement_fields) order by r.created_at)
    from app_private.approval_requests r
    join public.result_submissions s on s.id=r.submission_id
    left join app_private.result_corrections c on c.request_id=r.id
    where r.league_id=v_league and r.status='pending'),'[]'::jsonb);

 elsif p_action='invite_revoke' then
   v_league:=(p_data->>'league_id')::uuid; v_token:=(p_data->>'invite_token')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   update app_private.league_invitations set revoked_at=v_now
      where league_id=v_league and token=v_token and revoked_at is null;
   if not found then raise exception 'Unknown or already revoked invitation'; end if;
   insert into app_private.competition_events(actor_id,action,league_id)
     values(p_actor,'invitation_revoked',v_league);
   return jsonb_build_object('revoked',true);

 elsif p_action='remove_member' then
   v_league:=(p_data->>'league_id')::uuid; v_user:=(p_data->>'member_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   update public.league_memberships set left_at=v_now where league_id=v_league
     and user_id=v_user and left_at is null returning id into v_id;
   if v_id is null then raise exception 'No active membership'; end if;
   delete from app_private.league_moderator_delegations where membership_id=v_id;
   delete from app_private.league_review_delegations where membership_id=v_id;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
     values(p_actor,'member_removed',v_league,v_id);
   return jsonb_build_object('removed',true);

 elsif p_action='suspend_member' then
   v_league:=(p_data->>'league_id')::uuid; v_user:=(p_data->>'member_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   if v_user=p_actor or not exists(select 1 from public.profiles where id=v_user)
      then raise exception 'Cannot suspend owner or unknown account'; end if;
   if length(btrim(coalesce(p_data->>'reason',''))) not between 3 and 2000
      then raise exception 'Reason required'; end if;
   insert into app_private.league_suspensions(league_id,user_id,suspended_by,reason,active)
      values(v_league,v_user,p_actor,btrim(p_data->>'reason'),true)
      on conflict(league_id,user_id) do update set suspended_by=excluded.suspended_by,
        reason=excluded.reason,created_at=now(),suspended_until=null,active=true;
   update public.league_memberships set left_at=v_now where league_id=v_league
     and user_id=v_user and left_at is null returning id into v_id;
   if v_id is not null then
     delete from app_private.league_moderator_delegations where membership_id=v_id;
     delete from app_private.league_review_delegations where membership_id=v_id;
   end if;
   insert into app_private.competition_events(actor_id,action,league_id,details)
      values(p_actor,'member_suspended',v_league,jsonb_build_object('member_id',v_user));
   return jsonb_build_object('suspended',true);

 elsif p_action='unsuspend_member' then
   v_league:=(p_data->>'league_id')::uuid; v_user:=(p_data->>'member_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   update app_private.league_suspensions set active=false where league_id=v_league and user_id=v_user and active;
   if not found then raise exception 'No active suspension'; end if;
   insert into app_private.competition_events(actor_id,action,league_id,details)
      values(p_actor,'member_unsuspended',v_league,jsonb_build_object('member_id',v_user));
   return jsonb_build_object('unsuspended',true);

 elsif p_action='report' then
   v_league:=(p_data->>'league_id')::uuid;
   if not (exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      or exists(select 1 from public.league_memberships where league_id=v_league
        and user_id=p_actor and left_at is null))
      then raise exception 'Membership required to report' using errcode='42501'; end if;
   if length(btrim(coalesce(p_data->>'reason',''))) not between 3 and 2000
     then raise exception 'Report rationale required'; end if;
   insert into app_private.moderation_reports(league_id,filed_by,subject_user_id,reason)
     values(v_league,p_actor,(p_data->>'subject_user_id')::uuid,btrim(p_data->>'reason'))
     returning id into v_id;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
      values(p_actor,'report_filed',v_league,v_id);
   return jsonb_build_object('report_id',v_id);

 elsif p_action='report_queue' then
   v_league:=(p_data->>'league_id')::uuid;
   if not app_private.p4_authorized(p_actor,v_league,true)
     then raise exception 'Reports are private' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(jsonb_build_object('report_id',id,
     'reason',reason,'subject_user_id',subject_user_id,'created_at',created_at)
     order by created_at) from app_private.moderation_reports
     where league_id=v_league and state='pending'),'[]'::jsonb);

 elsif p_action='resolve_report' then
   v_league:=(p_data->>'league_id')::uuid; v_id:=(p_data->>'report_id')::uuid;
   if not app_private.p4_authorized(p_actor,v_league,true)
     then raise exception 'Review permission required' using errcode='42501'; end if;
   update app_private.moderation_reports set state='closed',resolved_at=v_now,resolved_by=p_actor
     where id=v_id and league_id=v_league and state='pending'
       and filed_by<>p_actor and (subject_user_id is null or subject_user_id<>p_actor);
   if not found then raise exception 'Independent report reviewer required'; end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
      values(p_actor,'report_closed',v_league,v_id);
   return jsonb_build_object('resolved',true);

 elsif p_action='create_league' then
   if length(btrim(coalesce(p_data->>'name',''))) not between 1 and 100
      or p_data->>'visibility' not in ('public','private') then
       raise exception 'Invalid league name or visibility'; end if;
   v_tz:=p_data->>'time_zone';
   if not exists(select 1 from pg_catalog.pg_timezone_names where name=v_tz) then
       raise exception 'IANA time zone required'; end if;
   insert into public.leagues(owner_user_id,name,visibility,time_zone)
     values(p_actor,btrim(p_data->>'name'),p_data->>'visibility',v_tz) returning id into v_league;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
     values(p_actor,'league_created',v_league,v_league);
   return jsonb_build_object('league_id',v_league);

 elsif p_action='start_season' then
   v_league:=(p_data->>'league_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   if exists(select 1 from public.league_seasons where league_id=v_league) then
      raise exception 'First season already created'; end if;
   select time_zone into v_tz from public.leagues where id=v_league;
   v_cadence:=p_data->>'cadence'; v_days:=(p_data->>'duration_days')::integer;
   select array_agg(value) into v_games from jsonb_array_elements_text(p_data->'games');
   if v_cadence='calendar_week' then
     v_start:=date_trunc('week',v_now at time zone v_tz) at time zone v_tz;
   elsif v_cadence='calendar_month' then
     v_start:=date_trunc('month',v_now at time zone v_tz) at time zone v_tz;
   else
     v_start:=date_trunc('day',v_now at time zone v_tz) at time zone v_tz;
   end if;
   v_season:=app_private.p4_make_season(v_league,1,v_start,v_cadence,v_days,v_games);
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
      values(p_actor,'season_started',v_league,v_season);
   return jsonb_build_object('season_id',v_season);

 elsif p_action='schedule_games' then
   v_league:=(p_data->>'league_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
       then raise exception 'Owner only' using errcode='42501'; end if;
   select max(sequence_no) into v_current from public.league_seasons where league_id=v_league;
   v_seq:=coalesce((p_data->>'target_sequence')::integer,v_current+1);
   if v_current is null or v_seq<=v_current then raise exception 'Changes must be for a future season'; end if;
   select array_agg(value) into v_games from jsonb_array_elements_text(p_data->'games');
   if coalesce(cardinality(v_games),0)=0 or array_position(v_games,null) is not null
     or cardinality(v_games)<>(select count(distinct x) from unnest(v_games) x)
     or exists(select 1 from unnest(v_games) x left join public.games g on g.id=x where g.id is null)
     then raise exception 'Invalid selected games'; end if;
   insert into app_private.scheduled_season_changes(league_id,target_sequence,selected_game_ids,scheduled_by)
      values(v_league,v_seq,v_games,p_actor)
      on conflict(league_id,target_sequence) do update set
       selected_game_ids=excluded.selected_game_ids,scheduled_by=excluded.scheduled_by,created_at=now();
   insert into app_private.competition_events(actor_id,action,league_id,details)
     values(p_actor,'season_change_scheduled',v_league,jsonb_build_object('sequence',v_seq,'games',v_games));
   return jsonb_build_object('scheduled_for',v_seq);

 elsif p_action='invite' then
   v_league:=(p_data->>'league_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   insert into app_private.league_invitations(league_id,issued_by,expires_at,max_uses)
     values(v_league,p_actor,v_now+interval '7 days',1) returning token into v_token;
   insert into app_private.competition_events(actor_id,action,league_id)
     values(p_actor,'invitation_created',v_league);
   return jsonb_build_object('invite_token',v_token,'expires_at',v_now+interval '7 days');

 elsif p_action='join' then
   if p_data ? 'invite_token' then
     v_token:=(p_data->>'invite_token')::uuid;
     select * into v_inv from app_private.league_invitations where token=v_token for update;
     if not found or v_inv.revoked_at is not null or v_inv.expires_at<=v_now
         or v_inv.use_count>=v_inv.max_uses then raise exception 'Invalid/expired invitation'; end if;
     v_league:=v_inv.league_id;
   else
     v_league:=(p_data->>'league_id')::uuid;
     if not exists(select 1 from public.leagues where id=v_league and visibility='public')
       then raise exception 'Private league requires invitation' using errcode='42501'; end if;
   end if;
   if exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor) then
      raise exception 'Owner already belongs to league'; end if;
   if exists(select 1 from app_private.league_suspensions where league_id=v_league
      and user_id=p_actor and active and (suspended_until is null or suspended_until>v_now))
     then raise exception 'League membership suspended' using errcode='42501'; end if;
   select id into v_id from public.league_memberships
      where league_id=v_league and user_id=p_actor and left_at is null;
   if v_id is not null then return jsonb_build_object('membership_id',v_id,'already_member',true); end if;
   insert into public.league_memberships(league_id,user_id,role,joined_at,effective_from)
     values(v_league,p_actor,'member',v_now,v_now) returning id into v_id;
   if v_token is not null then
      update app_private.league_invitations set use_count=use_count+1 where token=v_token;
   end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
      values(p_actor,'membership_joined',v_league,v_id);
   return jsonb_build_object('membership_id',v_id,'already_member',false);

 elsif p_action='leave' then
   v_league:=(p_data->>'league_id')::uuid;
   update public.league_memberships set left_at=v_now
     where league_id=v_league and user_id=p_actor and left_at is null returning id into v_id;
   if v_id is null then raise exception 'No active membership'; end if;
   delete from app_private.league_review_delegations where membership_id=v_id;
   delete from app_private.league_moderator_delegations where membership_id=v_id;
   insert into app_private.competition_events(actor_id,action,league_id,target_id)
      values(p_actor,'membership_left',v_league,v_id);
   return jsonb_build_object('left',true);

 elsif p_action='delegate_review' then
   v_league:=(p_data->>'league_id')::uuid; v_user:=(p_data->>'member_id')::uuid;
   if not exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
      then raise exception 'Owner only' using errcode='42501'; end if;
   select id into v_id from public.league_memberships where league_id=v_league
      and user_id=v_user and role='moderator' and left_at is null for update;
   if v_id is null then raise exception 'Review permission requires active moderator'; end if;
   if coalesce((p_data->>'enabled')::boolean,false) then
     insert into app_private.league_review_delegations(membership_id,granted_by)
       values(v_id,p_actor) on conflict(membership_id) do nothing;
   else
     delete from app_private.league_review_delegations where membership_id=v_id;
   end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id,details)
      values(p_actor,'review_delegation_changed',v_league,v_id,jsonb_build_object('enabled',p_data->>'enabled'));
   return jsonb_build_object('delegated',coalesce((p_data->>'enabled')::boolean,false));

 elsif p_action='submit' then
   v_raw:=p_data->>'raw_text'; v_game:=p_data->>'game';
   v_status:=p_data->>'status'; v_key:=p_data->>'identity_key';
   v_fields:=p_data->'fields'; v_parser:=p_data->>'parser_version';
   if length(btrim(coalesce(v_raw,'')))=0 or length(v_raw)>16000
     or v_parser is null or v_parser not like 'p4-%'
     or v_status not in ('recognized_valid','needs_review','ambiguous','invalid','unrecognized')
     then raise exception 'Invalid submission input'; end if;
   if v_game is not null and not exists(select 1 from public.games where id=v_game)
     then raise exception 'Unsupported game'; end if;
   -- P9 date-counter verification. The client NEVER selects a puzzle day for awards.
   -- SQL recomputes it from the number, and recomputes today's date from the server
   -- clock + the player's reported local UTC offset. Mismatches remain review-only.
   if p_data->>'identity_method'='local_calendar_v1' and v_game is not null
      and v_key is not null and v_status in ('recognized_valid','needs_review') then
     v_day_from_key:=app_private.p9_day_from_key(v_game,v_key);
     if (p_data->>'utc_offset_minutes') ~ '^-?[0-9]{1,4}$' then
       v_offset:=(p_data->>'utc_offset_minutes')::integer;
     end if;
     v_server_local_day:=app_private.p9_local_today(v_offset,v_now);
     if v_day_from_key is not null and jsonb_typeof(v_fields)='object' then
       begin
         perform app_private.p4_points(v_game,v_fields);
         v_score_valid:=true;
       exception when others then v_score_valid:=false; end;
     end if;
     -- A valid historical share gets its computed day so a moderator can
     -- approve it using the EXISTING review route and 48-hour exception gate.
     if v_day_from_key is not null and v_score_valid then
       select puzzle_day into v_existing_day from public.game_puzzles
         where game_id=v_game and identity_key=v_key and mode='daily'
           and verification_state='verified' for update;
       if found and v_existing_day is distinct from v_day_from_key then
         v_status:='needs_review';
       else
         insert into public.game_puzzles(game_id,mode,identity_key,puzzle_day,verification_state,verified_at,verification_note)
           values(v_game,'daily',v_key,v_day_from_key,'verified',now(),
             'Owner-approved local calendar counter v1; no independent source claimed')
           on conflict(game_id,mode,identity_key) do nothing;
         update public.game_puzzles set puzzle_day=v_day_from_key,verification_state='verified',
            verified_at=now(),verification_note='Owner-approved local calendar counter v1; no independent source claimed'
           where game_id=v_game and mode='daily' and identity_key=v_key
             and verification_state='candidate';
         select puzzle_day, verification_state into v_existing_day, v_verified
           from public.game_puzzles
           where game_id=v_game and mode='daily' and identity_key=v_key;
         v_date_identity:=coalesce(v_verified='verified' and v_existing_day=v_day_from_key,false);
       end if;
     end if;
     if not v_date_identity or v_server_local_day is null or
        p_data->>'local_day' is distinct from v_server_local_day::text or
        v_day_from_key is distinct from v_server_local_day then
       if v_status='recognized_valid' then v_status:='needs_review'; end if;
     end if;
   elsif v_status='recognized_valid' then
     -- An old client cannot bypass this rule using a syntactically valid share.
     v_status:='needs_review';
   end if;
   if v_game is not null and v_key is not null then
     if length(v_key) not between 1 and 64 then raise exception 'Invalid identity key'; end if;
     -- Across the old unverified and new daily rows, deduplicate one user's
     -- one game/identifier even if an old pending result still exists.
     select s.id into v_submission from public.result_submissions s
       join public.game_puzzles q on q.id=s.puzzle_id
       where s.account_id=p_actor and q.game_id=v_game and q.identity_key=v_key
       order by s.submitted_at limit 1;
     if v_submission is not null then
       return jsonb_build_object('submission_id',v_submission,'duplicate',true,'awarded',0);
     end if;
     select id into v_puzzle from public.game_puzzles where game_id=v_game and identity_key=v_key
       and mode='daily' and verification_state='verified';
     if v_puzzle is null then
       insert into public.game_puzzles(game_id,mode,identity_key,verification_state)
         values(v_game,'unverified',v_key,'candidate')
         on conflict(game_id,mode,identity_key) do update set identity_key=excluded.identity_key
         returning id into v_puzzle;
     end if;
     select id into v_submission from public.result_submissions
       where account_id=p_actor and puzzle_id=v_puzzle;
     if v_submission is not null then
       return jsonb_build_object('submission_id',v_submission,'duplicate',true,'awarded',0);
     end if;
   end if;
   -- Preserve unsupported format candidates as pending; never score them.
   -- Award/review functions recalculate only after a verified, approved identity.
   insert into public.result_submissions(account_id,game_id,puzzle_id,raw_share_text,
     submission_method,parser_version,parse_status,parsed_fields,review_status)
   values(p_actor,v_game,v_puzzle,v_raw,coalesce(p_data->>'method','paste'),v_parser,
     v_status,v_fields,case when v_status='invalid' then 'rejected' else 'pending' end)
   on conflict do nothing returning id into v_submission;
   if v_submission is null then
     select id into v_submission from public.result_submissions
       where account_id=p_actor and puzzle_id=v_puzzle;
     if v_submission is null then raise exception 'Submission uniqueness conflict'; end if;
     return jsonb_build_object('submission_id',v_submission,'duplicate',true,'awarded',0);
   end if;
   -- Automatic award only for confirmed daily identity and in-window recognised formats.
   if v_status='recognized_valid' and v_puzzle is not null then
     select * into v_puz from public.game_puzzles where id=v_puzzle;
     if v_puz.verification_state='verified' and v_puz.mode='daily' then
       update public.result_submissions set review_status='accepted' where id=v_submission;
       v_count:=app_private.p4_award(v_submission);
     end if;
   end if;
   if v_status not in ('invalid','unrecognized') then
     -- Per-league pending decisions, even if this same submission was scored
     -- successfully in another league with different timezone/eligibility.
     insert into app_private.approval_requests(submission_id,league_id,request_kind,requested_by,rationale)
       select v_submission,a.league_id,
              case when p_data->>'identity_method'='local_calendar_v1'
                    and v_status='needs_review' and v_day_from_key is not null
                   then 'historical_exception' else 'submission_review' end,
              p_actor,
              case when p_data->>'identity_method'='local_calendar_v1'
                    and v_status='needs_review'
                   then 'Submitted puzzle does not match local today or requires format review'
                   else 'Source/date/mode/eligibility requires review' end
       from (
         select id as league_id from public.leagues where owner_user_id=p_actor
         union
         select league_id from public.league_memberships where user_id=p_actor and left_at is null
       ) a
       where not exists(select 1 from public.league_score_entries e
           where e.submission_id=v_submission and e.league_id=a.league_id and e.voided_at is null);
   end if;
   if p_data->>'identity_method'='local_calendar_v1' then
     insert into app_private.competition_events(actor_id,action,target_id,details)
       values(p_actor,'local_calendar_identity_decision',v_submission,
         jsonb_build_object('game',v_game,'key',v_key,'derived_day',v_day_from_key,
           'client_day',p_data->>'local_day','server_local_day',v_server_local_day,
           'outcome',case when v_status='recognized_valid' and v_date_identity
             then 'date_matched' else 'pending_review' end,'rule','local_calendar_v1'));
   end if;
   insert into app_private.competition_events(actor_id,action,target_id,details)
      values(p_actor,'result_submitted',v_submission,jsonb_build_object('game',v_game,'status',v_status));
   return jsonb_build_object('submission_id',v_submission,'duplicate',false,
     'awarded',coalesce(v_count,0),'review_required',coalesce(v_count,0)=0);

 elsif p_action='request_historical' then
   v_submission:=(p_data->>'submission_id')::uuid;
   v_league:=(p_data->>'league_id')::uuid;
   select * into strict v_sub from public.result_submissions where id=v_submission;
   if v_sub.account_id<>p_actor then raise exception 'Not your result' using errcode='42501'; end if;
   if not (exists(select 1 from public.leagues where id=v_league and owner_user_id=p_actor)
     or exists(select 1 from public.league_memberships where league_id=v_league
       and user_id=p_actor)) then raise exception 'Not affiliated with league' using errcode='42501'; end if;
   insert into app_private.approval_requests(submission_id,league_id,request_kind,requested_by,rationale)
      values(v_submission,v_league,'historical_exception',p_actor,
       left(coalesce(nullif(btrim(p_data->>'rationale'),''),'Request to accept late historic result'),2000))
      returning id into v_request;
   return jsonb_build_object('request_id',v_request);

 elsif p_action='request_correction' then
   v_submission:=(p_data->>'submission_id')::uuid;
   v_league:=(p_data->>'league_id')::uuid;
   select * into strict v_sub from public.result_submissions where id=v_submission;
   if v_sub.account_id<>p_actor then raise exception 'Not your result' using errcode='42501'; end if;
   if not exists(select 1 from public.league_score_entries where submission_id=v_submission
      and league_id=v_league and voided_at is null) then raise exception 'No awarded entry to correct'; end if;
   if p_data->>'game' <> v_sub.game_id
      or p_data->>'identity_key' is distinct from
        (select identity_key from public.game_puzzles where id=v_sub.puzzle_id)
      or p_data->>'status' not in ('recognized_valid','needs_review') then
        raise exception 'Correction may not change game or puzzle identity'; end if;
   v_fields:=p_data->'fields'; v_points:=app_private.p4_points(v_sub.game_id,v_fields);
   v_raw:=p_data->>'replacement_raw_text';
   if length(btrim(coalesce(v_raw,'')))=0 or length(v_raw)>16000 then raise exception 'Invalid replacement'; end if;
   insert into app_private.approval_requests(submission_id,league_id,request_kind,requested_by,rationale)
      values(v_submission,v_league,'score_correction',p_actor,
      left(coalesce(nullif(btrim(p_data->>'rationale'),''),'Proposed correction'),2000))
      returning id into v_request;
   insert into app_private.result_corrections(submission_id,request_id,corrected_by,
     replacement_raw_text,replacement_parser_version,replacement_fields,prior_fields)
     values(v_submission,v_request,p_actor,v_raw,p_data->>'parser_version',v_fields,v_sub.parsed_fields);
   return jsonb_build_object('request_id',v_request,'proposed_performance',v_points);

 elsif p_action='review' then
   v_request:=(p_data->>'request_id')::uuid;
   select * into strict v_req from app_private.approval_requests where id=v_request for update;
   if v_req.status<>'pending' or v_req.league_id is null
      or not app_private.p4_authorized(p_actor,v_req.league_id,true)
     then raise exception 'Review denied' using errcode='42501'; end if;
   select * into strict v_sub from public.result_submissions where id=v_req.submission_id for update;
   -- League owners may decide their own league submissions; ordinary moderators
   -- retain the independent-review prohibition. The normal award and audit path applies.
   if (p_actor=v_req.requested_by or p_actor=v_sub.account_id)
     and not exists (select 1 from public.leagues l
       where l.id=v_req.league_id and l.owner_user_id=p_actor) then
     raise exception 'Independent moderator reviewer required' using errcode='42501'; end if;
   v_status:=p_data->>'decision';
   if v_status not in ('approved','rejected')
     or length(btrim(coalesce(p_data->>'rationale','')))<3
     then raise exception 'Decision/rationale required'; end if;
   if v_status='approved' then
     if v_sub.puzzle_id is null then raise exception 'Missing verified puzzle identity'; end if;
     select * into strict v_puz from public.game_puzzles where id=v_sub.puzzle_id;
     if v_puz.verification_state<>'verified' or v_puz.mode<>'daily' or v_puz.puzzle_day is null
        or v_sub.parse_status not in ('recognized_valid','needs_review') then
       raise exception 'Unverified or invalid result cannot be approved'; end if;
     if v_req.request_kind='score_correction' then
       select * into strict v_corr from app_private.result_corrections where request_id=v_req.id;
       v_oldpoints:=app_private.p4_points(v_sub.game_id,v_sub.parsed_fields);
       v_points:=app_private.p4_points(v_sub.game_id,v_corr.replacement_fields);
     end if;
   end if;
   -- Historical approval infrastructure requires decision inserted before request transition.
   insert into app_private.approval_decisions(request_id,decided_by,decision,rationale)
      values(v_request,p_actor,v_status,left(btrim(p_data->>'rationale'),2000));
   update app_private.approval_requests set status=v_status,resolved_at=v_now where id=v_request;
   if v_status='approved' then
     if v_req.request_kind='score_correction' then
       -- Frozen rule remains identical; only approved corrected metrics are applied.
       -- Correction is scoped to the league that approved it. The original
       -- submission interpretation and other leagues' awards remain unchanged.
       update public.league_score_entries set performance_points=v_points
         where submission_id=v_sub.id and league_id=v_req.league_id and voided_at is null;
       insert into app_private.competition_events(actor_id,action,league_id,target_id,details)
         values(p_actor,'score_corrected',v_req.league_id,v_sub.id,
           jsonb_build_object('previous_performance',v_oldpoints,'new_performance',v_points,
             'approval_request_id',v_request));
     else
       update public.result_submissions set review_status='accepted'
         where id=v_sub.id and review_status='pending';
       v_count:=app_private.p4_award(v_sub.id,v_req.league_id);
     end if;
   end if;
   insert into app_private.competition_events(actor_id,action,league_id,target_id,details)
      values(p_actor,'review_resolved',v_req.league_id,v_request,
        jsonb_build_object('decision',v_status,'type',v_req.request_kind));
   return jsonb_build_object('decision',v_status,'new_awards',coalesce(v_count,0));

 elsif p_action='tick' then
    v_count:=app_private.p4_tick();
    return jsonb_build_object('new_seasons',v_count);

 elsif p_action='my_history' then
   return coalesce((select jsonb_agg(jsonb_build_object('id',id,'game',game_id,
     'parse_status',parse_status,'review_status',review_status,'submitted_at',submitted_at)
     order by submitted_at desc) from (
       select * from public.result_submissions where account_id=p_actor
         order by submitted_at desc limit 100
     ) s),'[]'::jsonb);

 else raise exception 'Unknown competition action';
 end if;
end; $$;

-- Keep the original RPC exposed ONLY to the service role.
revoke all on function public.p4_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.p4_dispatch(uuid,text,jsonb) to service_role;
