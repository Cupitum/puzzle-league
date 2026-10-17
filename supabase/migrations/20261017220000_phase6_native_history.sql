-- Phase 6 extension: private, user-scoped original-result history for personal displays.
-- No scoring, awards, date inference, existing migrations, or client table grants changed.
create function public.p6_native_history(p_actor uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',s.id, 'game',s.game_id, 'identity_key',p.identity_key,
   'puzzle_day',case when p.verification_state='verified' then p.puzzle_day else null end,
   'result_display',case
     when s.game_id in ('wordle','polygonle') then case
       when s.parsed_fields->>'completed_failure'='true' then 'X/6'
       when (s.parsed_fields->>'attempts') ~ '^[1-6]$' then (s.parsed_fields->>'attempts')||'/6'
       else null end
     when s.game_id='foximax' then case
       when s.parsed_fields->>'completed_failure'='true' then 'X/'||coalesce(s.parsed_fields->>'fraction_denominator','8')
       when (s.parsed_fields->>'fraction_numerator') ~ '^[0-9]+$' then (s.parsed_fields->>'fraction_numerator')||'/'||coalesce(s.parsed_fields->>'fraction_denominator','8')
       else null end
     when s.game_id='minute_cryptic' and (s.parsed_fields->>'hints_used') ~ '^[0-9]+$' then
       (s.parsed_fields->>'hints_used')||' hints'
     when s.game_id='krillion' and (s.parsed_fields->>'reported_number') ~ '^[0-9]+$' then
       s.parsed_fields->>'reported_number'
     else null end,
   'parse_status',s.parse_status,'review_status',s.review_status,
   'submitted_at',s.submitted_at,
   'awarded_leagues',(select count(distinct e.season_id) from public.league_score_entries e
     where e.submission_id=s.id and e.voided_at is null)
 ) order by s.submitted_at desc),'[]'::jsonb)
 from (select * from public.result_submissions where account_id=p_actor order by submitted_at desc limit 100) s
 left join public.game_puzzles p on p.id=s.puzzle_id
 where p_actor is not null and exists(select 1 from public.profiles f where f.id=p_actor);
$$;
revoke all on function public.p6_native_history(uuid) from public,anon,authenticated;
grant execute on function public.p6_native_history(uuid) to service_role;
