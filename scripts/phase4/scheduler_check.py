#!/usr/bin/env python3
"""Verify the real local pg_cron job and an actual disposable worker execution.

The single probe does only SELECT 1, has an unpredictable name, and is removed
in finally; it does not modify league data, settings, or original migrations.
No credentials, job details or SQL errors are printed on failure.
"""
from __future__ import annotations
import secrets
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'/'phase3'))
from local_db import psql, verify_local  # noqa: E402

NAME = 'puzzle-league-season-maintenance'
FREQ = '*/5 * * * *'
COMMAND = 'select app_private.p4_tick(now());'


def qliteral(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    verify_local()
    if psql("select (to_regclass('cron.job') is not null)::text") != 'true':
        raise RuntimeError('cron.job missing: pg_cron not enabled; no scheduler acceptance')
    if psql("select count(*) from pg_extension where extname='pg_cron'") != '1':
        raise RuntimeError('pg_cron extension not registered')
    rows = psql("select schedule || '|' || command || '|' || database || '|' || username || '|' || active::text "
                f"from cron.job where jobname={qliteral(NAME)};").splitlines()
    expected = f'{FREQ}|{COMMAND}|postgres|postgres|true'
    if rows != [expected]:
        raise RuntimeError('Puzzle League maintenance job absent or differs from approved schedule')
    log_enabled = psql("select coalesce(current_setting('cron.log_run',true),'off')")
    if log_enabled != 'on':
        raise RuntimeError('pg_cron execution logging disabled; cannot independently verify job execution')
    # We verify the worker executes on this live local host, rather than merely
    # asserting a job row exists. The probe is read-only and self-removing.
    probe = 'puzzle-league-phase4-check-' + secrets.token_hex(6)
    jobid = ''
    error = None
    try:
        jobid = psql("select cron.schedule(" + qliteral(probe) +
                     ", '* * * * *', 'select 1;')")
        if not jobid.isdecimal():
            raise RuntimeError('Failed to create disposable pg_cron probe')
        deadline = time.monotonic() + 90
        result = None
        while time.monotonic() < deadline:
            status = psql("select status from cron.job_run_details where jobid=" + jobid +
                          " order by start_time desc nulls last, runid desc limit 1")
            if status == 'succeeded':
                result = status
                break
            if status == 'failed':
                raise RuntimeError('Disposable pg_cron worker executed but failed; inspect private server logs')
            time.sleep(3)
        if result != 'succeeded':
            raise RuntimeError('No successful pg_cron probe execution within 90 seconds')
    except Exception as exc:
        error = exc
    finally:
        if jobid.isdecimal():
            try:
                removed = psql('select cron.unschedule(' + jobid + ');')
                if removed != 't' and removed != 'true':
                    raise RuntimeError('Failed to remove disposable scheduler probe')
            except Exception as exc:
                error = RuntimeError('Scheduler probe cleanup failed; inspect local cron.job')
    if error:
        raise error
    print('PASS: pg_cron installed; 5-minute season-maintenance job registered and active')
    print('PASS: disposable pg_cron worker probe actually executed; probe removed')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('PHASE 4 SCHEDULER CHECK: FAIL: ' + str(exc), file=sys.stderr)
        raise SystemExit(1)
