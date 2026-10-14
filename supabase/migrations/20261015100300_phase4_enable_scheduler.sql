-- Phase 4 follow-up: activate unattended season processing after pg_cron availability.
-- Previous registered 20261015100200 migration intentionally skipped scheduling
-- on databases where the extension was not yet enabled. Do NOT rewrite it.
-- Supabase-supported installation location for pg_cron: pg_catalog.
create extension if not exists pg_cron with schema pg_catalog;

-- Deny any implicit client use of the scheduler schema; the SQL worker is postgres.
revoke all on schema cron from public, anon, authenticated;
revoke all on all tables in schema cron from public, anon, authenticated;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare
  v_id bigint;
  v_existing record;
begin
  if to_regclass('cron.job') is null then
    raise exception 'pg_cron is installed without cron.job';
  end if;
  select jobid, schedule, command, database, username, active
    into v_existing
    from cron.job
   where jobname='puzzle-league-season-maintenance';
  if found then
    if v_existing.schedule <> '*/5 * * * *'
       or v_existing.command <> 'select app_private.p4_tick(now());'
       or v_existing.database <> current_database()
       or v_existing.username <> 'postgres'
       or v_existing.active is distinct from true then
      raise exception 'Existing Puzzle League cron job differs from approved job; no overwrite';
    end if;
    raise notice 'Phase 4: existing approved maintenance job preserved';
  else
    select cron.schedule('puzzle-league-season-maintenance',
      '*/5 * * * *', 'select app_private.p4_tick(now());') into v_id;
    if v_id is null then
      raise exception 'Could not register Phase 4 maintenance';
    end if;
    raise notice 'Phase 4: automatic maintenance job registered (every five minutes)';
  end if;
end;
$$;
