-- Optional local pg_cron runner for duplicate-safe season transition/finalisation.
-- If pg_cron is not provisioned, deployment must arrange scheduled invocation;
-- do NOT pretend that the 'tick' API alone constitutes unattended automation.
do $$
declare v_job_id bigint;
begin
  if to_regclass('cron.job') is not null then
    execute $run$select cron.schedule('puzzle-league-season-maintenance',
      '*/5 * * * *', 'select app_private.p4_tick(now());')$run$ into v_job_id;
    raise notice 'Phase 4: pg_cron automatic maintenance registered';
  else
    raise notice 'Phase 4: pg_cron not available; unattended maintenance NOT CONFIGURED';
  end if;
end;
$$;
