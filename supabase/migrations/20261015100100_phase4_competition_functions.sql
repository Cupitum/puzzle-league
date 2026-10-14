-- Phase 4 trusted server RPCs. The Edge function authenticates each JWT with Supabase Auth,
-- then invokes this RPC with service_role only. Never grant EXECUTE to anon/authenticated.
-- SQL mutations are transactional, with the database making the final score decision.

create function app_private.p4_points(p_game text, p_fields jsonb)
returns integer language plpgsql immutable set search_path='' as $$
declare n integer; failed boolean; v text;
begin
 if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception 'Missing parsed fields'; end if;
 if p_game='minute_cryptic' then
   v:=p_fields->>'hints_used';
   if v is null or v !~ '^[0-9]{1,5}$' then raise exception 'Invalid hints'; end if;
   n:=v::integer; return greatest(0,10-n);
 end if;
 if p_game='krillion' then
   v:=p_fields->>'reported_number';
   if v is null or v !~ '^[0-9]{1,3}$' or v::integer>700 then raise exception 'Invalid Krillion score'; end if;
   return least(10,(v::integer+35)/70);
 end if;
 if p_game='foximax' and p_fields->>'fraction_denominator'<>'8' then raise exception 'FoxiMax must be /8'; end if;
 if p_game='polygonle' and (p_fields->>'attempt_limit_displayed'<>'6'
     or (p_fields->>'word_length_observed') not in ('6','7','8')) then
   raise exception 'Unsupported Polygonle format'; end if;
 if p_game not in ('wordle','foximax','polygonle') then raise exception 'Unsupported game'; end if;
 failed:=(p_fields->>'completed_failure')::boolean;
 v:=p_fields->>(case when p_game='foximax' then 'fraction_numerator' else 'attempts' end);
 if failed is true then
   if v is not null then raise exception 'Contradictory failure fields'; end if;
   return 0;
 end if;
 if failed is distinct from false or v is null or v !~ '^[1-8]$' then raise exception 'Invalid attempt count'; end if;
 n:=v::integer;
 if p_game='foximax' then
   return (array[10,9,7,6,5,4,2,1])[n];
 end if;
 if n>6 then raise exception 'Attempt count exceeds six'; end if;
 return (array[10,8,6,4,2,1])[n];
end; $$;

create function app_private.p4_authorized(p_actor uuid,p_league uuid,p_review boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.leagues where id=p_league and owner_user_id=p_actor)
   or (p_review and exists (
     select 1 from public.league_memberships m
       join app_private.league_review_delegations d on d.membership_id=m.id
     where m.league_id=p_league and m.user_id=p_actor
       and m.role='moderator' and m.left_at is null));
$$;

create function app_private.p4_make_season(p_league uuid,p_sequence integer,p_start timestamptz,
 p_cadence text,p_days integer,p_games text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_end timestamptz; v_tz text; v_game text;
begin
 select time_zone into strict v_tz from public.leagues where id=p_league;
 if p_cadence not in ('calendar_week','calendar_month','rolling_days')
    or coalesce(cardinality(p_games),0)=0 or array_position(p_games,null) is not null
    or (select count(distinct x) from unnest(p_games) x)<>cardinality(p_games)
    then raise exception 'Invalid season configuration'; end if;
 if p_cadence='rolling_days' then
    if p_days is null or p_days<1 or p_days>366 then raise exception 'Invalid rolling duration'; end if;
    v_end:=p_start + make_interval(days=>p_days);
 else
    if p_days is not null then raise exception 'Calendar cadence has no day count'; end if;
    if p_cadence='calendar_week' then
      v_end:=((p_start at time zone v_tz)+interval '1 week') at time zone v_tz;
    else
      v_end:=((p_start at time zone v_tz)+interval '1 month') at time zone v_tz;
    end if;
 end if;
 if exists(select 1 from unnest(p_games) g left join public.games x on x.id=g where x.id is null) then
   raise exception 'Unknown selected game'; end if;
 insert into public.league_seasons (league_id,sequence_no,cadence,duration_days,starts_at,ends_at,state)
 values(p_league,p_sequence,p_cadence,p_days,p_start,v_end,
   case when p_start<=now() then 'active' else 'scheduled' end)
 on conflict(league_id,sequence_no) do update
   set sequence_no=excluded.sequence_no
 returning id into v_id;
 if exists(select 1 from public.season_game_settings where season_id=v_id) then return v_id; end if;
 insert into public.season_game_settings(season_id,game_id,rule_version)
 select v_id,g.id,g.approved_rule_version from public.games g where g.id=any(p_games);
 return v_id;
end; $$;

create function app_private.p4_tick(p_as_of timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare v public.league_seasons%rowtype; v_games text[]; v_start timestamptz; v_tz text; v_change text[]; v_n integer:=0;
begin
 -- Serialise competing ticks in this database. Work is idempotent by unique league/sequence.
 perform pg_advisory_xact_lock(19451777,4);
 for v in select * from public.league_seasons where ends_at<=p_as_of
    and state in ('active','review','scheduled') order by league_id,sequence_no loop
   if v.state <> 'review' then
     update public.league_seasons set state='review' where id=v.id;
   end if;
   if not exists(select 1 from public.league_seasons where league_id=v.league_id and sequence_no=v.sequence_no+1) then
     select array_agg(game_id order by game_id) into v_games
       from public.season_game_settings where season_id=v.id;
     select selected_game_ids into v_change from app_private.scheduled_season_changes
       where league_id=v.league_id and target_sequence=v.sequence_no+1;
     if v_change is not null then v_games:=v_change; end if;
     perform app_private.p4_make_season(v.league_id,v.sequence_no+1,v.ends_at,v.cadence,v.duration_days,v_games);
     v_n:=v_n+1;
   end if;
   -- Reviews can finish only after 48h and with no pending league-specific decisions.
   if p_as_of >= v.ends_at+interval '48 hours' and not exists (
      select 1 from app_private.approval_requests r
      where r.league_id=v.league_id and r.status='pending'
        and (exists (select 1 from public.result_submissions s
          join public.game_puzzles p on p.id=s.puzzle_id
          where s.id=r.submission_id
            and (p.puzzle_day::timestamp at time zone
              (select l.time_zone from public.leagues l where l.id=v.league_id))>=v.starts_at
            and (p.puzzle_day::timestamp at time zone
              (select l.time_zone from public.leagues l where l.id=v.league_id))<v.ends_at)
       or exists(select 1 from public.result_submissions s left join public.game_puzzles p on p.id=s.puzzle_id
          where s.id=r.submission_id and p.puzzle_day is null))
   ) then
     update public.league_seasons set state='finalised',finalised_at=p_as_of where id=v.id and state<>'finalised';
   end if;
 end loop;
 update public.league_seasons set state='active'
   where starts_at<=p_as_of and ends_at>p_as_of and state='scheduled';
 return v_n;
end; $$;

create function app_private.p4_award(p_submission uuid,p_only_league uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare s public.result_submissions%rowtype; p public.game_puzzles%rowtype; v record;
 v_performance integer; v_rule text; v_count integer:=0; v_daystart timestamptz; v_deadline timestamptz;
begin
 select * into strict s from public.result_submissions where id=p_submission for update;
 if s.review_status<>'accepted' or s.puzzle_id is null then return 0; end if;
 select * into strict p from public.game_puzzles where id=s.puzzle_id;
 if p.verification_state<>'verified' or p.puzzle_day is null or p.mode<>'daily' then return 0; end if;
 v_performance:=app_private.p4_points(s.game_id,s.parsed_fields);
 for v in
   select l.id league_id,l.time_zone,ss.id season_id,ss.state,sg.rule_version,ss.starts_at,ss.ends_at
   from public.leagues l join public.league_seasons ss on ss.league_id=l.id
   join public.season_game_settings sg on sg.season_id=ss.id and sg.game_id=s.game_id
   where (p_only_league is null or p_only_league=l.id) and ss.state<>'finalised'
 loop
    v_daystart:=(p.puzzle_day::timestamp at time zone v.time_zone);
    v_deadline:=((p.puzzle_day+1)::timestamp at time zone v.time_zone)+interval '48 hours';
    if not (v_daystart>=v.starts_at and v_daystart<v.ends_at) then continue; end if;
    if not (exists(select 1 from public.leagues where id=v.league_id and owner_user_id=s.account_id
       and (created_at at time zone v.time_zone)::date<=p.puzzle_day)
       or exists(select 1 from public.league_memberships m where m.league_id=v.league_id
         and m.user_id=s.account_id
         and (m.left_at is null or (m.left_at at time zone v.time_zone)::date>p.puzzle_day)
         and (m.effective_from at time zone v.time_zone)::date<=p.puzzle_day)) then continue; end if;
    if s.submitted_at>v_deadline and not exists (
      select 1 from app_private.approval_requests r where r.submission_id=s.id
        and r.league_id=v.league_id and r.request_kind='historical_exception' and r.status='approved'
    ) then continue; end if;
    select approved_rule_version into v_rule from public.games where id=s.game_id;
    -- Versioning: a historical season must not accidentally use a newer rule.
    if v_rule<>v.rule_version then continue; end if;
    insert into public.league_score_entries(submission_id,league_id,season_id,game_id,account_id,
       rule_version,performance_points,participation_points)
    values(s.id,v.league_id,v.season_id,s.game_id,s.account_id,v.rule_version,v_performance,1)
    on conflict(submission_id,season_id) do nothing;
    if found then
      v_count:=v_count+1;
      insert into app_private.competition_events(actor_id,action,target_id,league_id,details)
       values(null,'score_awarded',s.id,v.league_id,
          jsonb_build_object('season_id',v.season_id,'game',s.game_id,
            'rule_version',v.rule_version,'performance',v_performance,'participation',1));
    end if;
 end loop;
 return v_count;
end; $$;

-- No app-facing route can self-certify an official puzzle. Operator-only controlled
-- function: verify only against an independently established game/puzzle/day/mode.
create function app_private.p4_operator_verify_puzzle(p_game text,p_key text,p_day date,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_game is null or p_key is null or p_day is null or length(btrim(coalesce(p_note,'')))<12
    then raise exception 'Verified evidence, date, game and puzzle ID required'; end if;
 if not exists(select 1 from public.games where id=p_game) then raise exception 'Unknown game'; end if;
 select id into v_id from public.game_puzzles where game_id=p_game and identity_key=p_key
   and mode in ('unverified','daily') order by (mode='daily') desc limit 1 for update;
 if v_id is null then
   insert into public.game_puzzles(game_id,mode,identity_key,puzzle_day,verification_state,verified_at,verification_note)
   values(p_game,'daily',p_key,p_day,'verified',now(),p_note) returning id into v_id;
 else
   update public.game_puzzles set mode='daily',puzzle_day=p_day,verification_state='verified',
     verified_at=now(),verification_note=p_note where id=v_id;
 end if;
 return v_id;
end; $$;

-- Only the database operator (not API's service-role credential) may call this.
revoke all on function app_private.p4_operator_verify_puzzle(text,text,date,text) from public,anon,authenticated,service_role;

-- Verified streak statistics are derived independently; they award zero bonus points.
create function app_private.p4_streaks(p_season uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with days as (
  select distinct e.account_id,e.game_id,p.puzzle_day
  from public.league_score_entries e join public.result_submissions s on s.id=e.submission_id
  join public.game_puzzles p on p.id=s.puzzle_id
  where e.season_id=p_season and e.voided_at is null and p.verification_state='verified'
 ), runs as (
   select account_id,game_id,puzzle_day,
     puzzle_day-(row_number() over(partition by account_id,game_id order by puzzle_day))::integer island
   from days
 ), lengths as (
   select account_id,game_id,count(*) length from runs group by account_id,game_id,island
 ), longest as (
   select account_id,game_id,max(length) maximum from lengths group by account_id,game_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('nickname',p.nickname,
   'game',l.game_id,'longest_streak',l.maximum) order by l.game_id,p.nickname),'[]'::jsonb)
 from longest l join public.profiles p on p.id=l.account_id;
$$;
revoke all on function app_private.p4_streaks(uuid) from public,anon,authenticated;

-- View limited, non-identifying league scores and public names. No email leak.
create function app_private.p4_standings(p_actor uuid,p_season uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_league uuid; v_vis text; v_allowed boolean;
begin
 select s.league_id,l.visibility into v_league,v_vis
   from public.league_seasons s join public.leagues l on l.id=s.league_id where s.id=p_season;
 if v_league is null then raise exception 'Unknown season'; end if;
 v_allowed:=v_vis='public' or app_private.p4_authorized(p_actor,v_league,true)
   or exists(select 1 from public.league_memberships where league_id=v_league and user_id=p_actor and left_at is null);
 if not v_allowed then raise exception 'Private season access denied' using errcode='42501'; end if;
 return jsonb_build_object(
   'combined',coalesce((select jsonb_agg(jsonb_build_object('nickname',q.nickname,
      'total',q.points,'rank',q.place) order by q.points desc,q.nickname) from (
        select pr.nickname,sum(e.performance_points+e.participation_points) points,
           rank() over (order by sum(e.performance_points+e.participation_points) desc) place
        from public.league_score_entries e join public.profiles pr on pr.id=e.account_id
        where e.season_id=p_season and e.voided_at is null
        group by e.account_id,pr.nickname
   ) q),'[]'::jsonb),
   'by_game',coalesce((select jsonb_agg(jsonb_build_object('game',q.game_id,
       'nickname',q.nickname,'total',q.points,'rank',q.place)
       order by q.game_id,q.points desc,q.nickname) from (
         select e.game_id,pr.nickname,sum(e.performance_points+e.participation_points) points,
           rank() over (partition by e.game_id
             order by sum(e.performance_points+e.participation_points) desc) place
         from public.league_score_entries e join public.profiles pr on pr.id=e.account_id
         where e.season_id=p_season and e.voided_at is null
         group by e.game_id,e.account_id,pr.nickname
   ) q),'[]'::jsonb),
   'streaks',app_private.p4_streaks(p_season));
end; $$;

create function public.p4_dispatch(p_actor uuid,p_action text,p_data jsonb default '{}'::jsonb)
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
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_action)>80 then
   raise exception 'Bad request' using errcode='22023'; end if;
 if p_action='standings' then
   return app_private.p4_standings(p_actor,(p_data->>'season_id')::uuid);
 end if;
 if p_actor is null or not exists(select 1 from public.profiles where id=p_actor) then
   raise exception 'Authenticated profile required' using errcode='42501'; end if;

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
   if v_game is not null and v_key is not null then
     if length(v_key) not between 1 and 64 then raise exception 'Invalid identity key'; end if;
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
       select v_submission,a.league_id,'submission_review',p_actor,
              'Source/date/mode/eligibility requires review'
       from (
         select id as league_id from public.leagues where owner_user_id=p_actor
         union
         select league_id from public.league_memberships where user_id=p_actor and left_at is null
       ) a
       where not exists(select 1 from public.league_score_entries e
           where e.submission_id=v_submission and e.league_id=a.league_id and e.voided_at is null);
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
   if p_actor=v_req.requested_by or p_actor=v_sub.account_id then
     raise exception 'Independent reviewer required' using errcode='42501'; end if;
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

revoke all on function public.p4_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.p4_dispatch(uuid,text,jsonb) to service_role;
revoke all on function app_private.p4_points(text,jsonb),
  app_private.p4_authorized(uuid,uuid,boolean),
  app_private.p4_make_season(uuid,integer,timestamptz,text,integer,text[]),
  app_private.p4_tick(timestamptz),
  app_private.p4_award(uuid,uuid),
  app_private.p4_standings(uuid,uuid)
 from public,anon,authenticated;
-- Intentional: no direct table grants to anon/authenticated. Base RLS remains enabled.
