-- Phase 6: read-only, service-role-only dashboard; no client table grants.
-- Identity is derived ONLY from verified daily puzzles with authoritative puzzle_day.
create or replace function app_private.p6_daily_dashboard(p_actor uuid)
returns jsonb language sql stable security definer set search_path='' as $$
with eligible as (
 select distinct g.game_id, l.id league_id, l.time_zone, s.id season_id,
   (now() at time zone l.time_zone)::date local_day
 from public.leagues l join public.league_seasons s on s.league_id=l.id
 join public.season_game_settings g on g.season_id=s.id
 where s.state='active' and now()>=s.starts_at and now()<s.ends_at
 and (l.owner_user_id=p_actor or exists (
   select 1 from public.league_memberships m
   where m.league_id=l.id and m.user_id=p_actor and m.left_at is null
   and m.joined_at<=now()))
), candidates as (
 select e.game_id,e.league_id,e.season_id,e.local_day,p.id puzzle_id,p.identity_key,
   p.puzzle_day
 from eligible e left join public.game_puzzles p
   on p.game_id=e.game_id and p.mode='daily'
   and p.verification_state='verified' and p.puzzle_day=e.local_day
), grouped as (
 select game_id,puzzle_id,identity_key,puzzle_day,
   count(distinct league_id) eligible_leagues,
   array_agg(distinct season_id) seasons
 from candidates group by game_id,puzzle_id,identity_key,puzzle_day
), rows as (
 select g.*,
  (select s.id from public.result_submissions s
    where s.account_id=p_actor and s.puzzle_id=g.puzzle_id
    order by s.submitted_at desc limit 1) submission_id
 from grouped g
)
select coalesce(jsonb_agg(jsonb_build_object(
 'game',r.game_id,'puzzle_id',r.puzzle_id,'identity_key',r.identity_key,
 'puzzle_day',r.puzzle_day,'eligible_leagues',r.eligible_leagues,
 'status', case when r.puzzle_id is null then 'unverified'
   when r.submission_id is null then 'outstanding'
   when coalesce((select s.review_status from public.result_submissions s where s.id=r.submission_id),'')='pending' then 'pending'
   when exists(select 1 from public.league_score_entries e where e.submission_id=r.submission_id
      and e.season_id=any(r.seasons) and e.voided_at is null) then 'awarded'
   else 'submitted_unawarded' end,
 'points',coalesce((select max(e.performance_points+e.participation_points)
   from public.league_score_entries e where e.submission_id=r.submission_id
   and e.season_id=any(r.seasons) and e.voided_at is null),0),
 'streak',null,'submission_id',r.submission_id
 ) order by r.game_id,r.puzzle_day nulls last),'[]'::jsonb)
from rows r;
$$;
revoke all on function app_private.p6_daily_dashboard(uuid) from public,anon,authenticated;
grant execute on function app_private.p6_daily_dashboard(uuid) to service_role;
-- Service-role-only public transport wrapper: caller identity is authenticated by Edge Auth.
create or replace function public.p6_daily_dashboard(p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_actor is null or not exists(select 1 from public.profiles where id=p_actor) then
  raise exception 'Authenticated profile required' using errcode='42501';
 end if;
 return app_private.p6_daily_dashboard(p_actor);
end; $$;
revoke all on function public.p6_daily_dashboard(uuid) from public,anon,authenticated;
grant execute on function public.p6_daily_dashboard(uuid) to service_role;
