-- P9 local calendar identity / no data changes (all assertions in rollback).
begin;
set local statement_timeout = '15s';
do $$
declare d date;
begin
 if app_private.p9_day_from_key('wordle','1954') <> date '2026-10-25'
 or app_private.p9_day_from_key('foximax','1520') <> date '2026-10-25'
 or app_private.p9_day_from_key('krillion','102') <> date '2026-10-25'
 or app_private.p9_day_from_key('polygonle','1547') <> date '2026-10-25'
 or app_private.p9_day_from_key('minute_cryptic','2026-10-25') <> date '2026-10-25'
 then raise exception 'Baseline anchor mismatch'; end if;
 if app_private.p9_day_from_key('wordle','1955') <> date '2026-10-26'
 or app_private.p9_day_from_key('foximax','1521') <> date '2026-10-26'
 or app_private.p9_day_from_key('krillion','103') <> date '2026-10-26'
 or app_private.p9_day_from_key('polygonle','1548') <> date '2026-10-26'
 or app_private.p9_day_from_key('minute_cryptic','2026-10-26') <> date '2026-10-26'
 then raise exception 'Increment mismatch'; end if;
 if app_private.p9_day_from_key('wordle','1953') <> date '2026-10-24'
 or app_private.p9_day_from_key('wordle','1') <> date '2021-06-20'
 then raise exception 'Historic date mismatch'; end if;
 if app_private.p9_day_from_key('wordle','abc') is not null
 or app_private.p9_day_from_key('wordle','0') is not null
 or app_private.p9_day_from_key('foximax','999999999999') is not null
 or app_private.p9_day_from_key('minute_cryptic','2026-02-30') is not null
 or app_private.p9_day_from_key('minute_cryptic','2026-10-25abc') is not null
 then raise exception 'Invalid identity unexpectedly accepted'; end if;
 if app_private.p9_local_today(-480,'2026-10-24 16:05:00+00'::timestamptz) <> date '2026-10-25'
 or app_private.p9_local_today(300,'2026-10-26 03:59:00+00'::timestamptz) <> date '2026-10-25'
 or app_private.p9_local_today(0,'2026-10-26 00:00:00+00'::timestamptz) <> date '2026-10-26'
 or app_private.p9_local_today(900,now()) is not null
 or app_private.p9_local_today(5,now()) is not null
 then raise exception 'Server local-day conversion mismatch'; end if;
 if has_function_privilege('authenticated','public.p4_dispatch(uuid,text,jsonb)','execute')
 or has_function_privilege('anon','public.p4_dispatch(uuid,text,jsonb)','execute')
 or has_function_privilege('authenticated','app_private.p9_day_from_key(text,text)','execute')
 or has_function_privilege('service_role','app_private.p9_day_from_key(text,text)','execute')
 then raise exception 'Identity service privilege regression'; end if;
 raise notice 'P9 calendar identity SQL: PASS';
end $$;
rollback;
