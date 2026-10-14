#!/usr/bin/env python3
"""Phase 4 local-only backup / isolated restore acceptance (20 app tables).

Original Phase 3 recovery implementation is left intact. This routine shares
its safe Docker/dump helpers and adds the Phase 4 btree_gist dependency and
full inventory/fingerprint checks. The main local DB is never restored to,
reset, or dropped. Only newly-created disposable targets can be removed.
"""
from __future__ import annotations

import os
import re
import secrets
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'phase3'))
import local_db as db  # noqa: E402
from backup_restore_verify import stream_to_file  # noqa: E402

APP_TABLES = (
    ('public', 'profiles'), ('public', 'games'), ('public', 'leagues'),
    ('public', 'league_memberships'), ('public', 'game_puzzles'),
    ('public', 'result_submissions'),
    ('app_private', 'league_moderator_delegations'),
    ('app_private', 'approval_requests'), ('app_private', 'approval_decisions'),
    ('app_private', 'result_audit_events'),
    ('public', 'league_seasons'), ('public', 'season_game_settings'),
    ('public', 'league_score_entries'),
    ('app_private', 'league_invitations'),
    ('app_private', 'scheduled_season_changes'),
    ('app_private', 'league_suspensions'),
    ('app_private', 'moderation_reports'),
    ('app_private', 'league_review_delegations'),
    ('app_private', 'competition_events'),
    ('app_private', 'result_corrections'),
)


def db_sql(database: str, statement: str) -> str:
    return db.psql(statement, database)


def fingerprints(database: str = 'postgres') -> dict[str, str]:
    """Stable whole-row fingerprints for every Phase 3 and Phase 4 table."""
    result = {}
    for schema, table in APP_TABLES:
        statement = (
            "select count(*)::text || '|' || "
            "coalesce(md5(string_agg(row_to_json(t)::text, E'\\n' "
            "order by row_to_json(t)::text)),md5('')) "
            f'from "{schema}"."{table}" t;'
        )
        result[f'{schema}.{table}'] = db_sql(database, statement)
    return result


def verify_inventory() -> str:
    """Fail closed on missing or newly introduced app tables."""
    current = db_sql('postgres', '''
      select n.nspname || '.' || c.relname
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','app_private') and c.relkind in ('r','p')
      order by 1;
    ''').splitlines()
    expected = sorted(f'{schema}.{table}' for schema,table in APP_TABLES)
    if current != expected:
        raise RuntimeError('Unexpected application-table inventory: restore gate refuses incomplete coverage')
    row_security = db_sql('postgres', '''
      select n.nspname || '.' || c.relname
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','app_private') and c.relkind in ('r','p')
      and c.relrowsecurity order by 1;
    ''').splitlines()
    if row_security != expected:
        raise RuntimeError('Application table RLS inventory differs from the expected 20 tables')
    ext_namespace = db_sql('postgres', '''
      select n.nspname from pg_extension e
      join pg_namespace n on n.oid=e.extnamespace
      where e.extname='btree_gist';
    ''')
    if ext_namespace not in ('extensions', 'public'):
        raise RuntimeError('Expected btree_gist extension missing or in unexpected source schema')
    return ext_namespace


def restore_application_archive(archive: Path, target: str, extension_schema: str, private: Path) -> int:
    """Restore into clone, preserve object ACL, omit nonportable DEFAULT ACL.

    Retain verbose error evidence *privately* if a restore fails. The terminal
    displays only a diagnostic log location, never SQL contents or user data.
    """
    with archive.open('rb') as handle:
        toc = subprocess.run(['docker','exec','-i',db.CONTAINER,'pg_restore','--list'],
                             stdin=handle, capture_output=True)
    if toc.returncode:
        raise RuntimeError('Cannot inspect isolated application archive inventory')
    original = toc.stdout.decode('utf-8', errors='replace')
    if 'TABLE DATA' not in original:
        raise RuntimeError('Isolated archive has no application table data')
    result = []
    omitted = 0
    for line in original.splitlines(keepends=True):
        if re.match(r'^\d+;\s+\d+\s+\d+\s+DEFAULT ACL(?:\s|$)', line):
            result.append(';' + line)
            omitted += 1
        elif extension_schema == 'public' and re.match(
                r'^\d+;\s+\d+\s+\d+\s+SCHEMA - public(?:\s|$)', line):
            # In the rare case btree_gist already lives in public, that schema
            # must be created first for its extension, so do not create twice.
            result.append(';' + line)
        else:
            result.append(line)
    name = '/tmp/puzzle_phase4_restore_' + secrets.token_hex(10) + '.list'
    try:
        w = subprocess.run(['docker','exec','-i',db.CONTAINER,'sh','-c',
                            'umask 077; cat > ' + name],
                           input=''.join(result).encode(),capture_output=True)
        if w.returncode:
            raise RuntimeError('Could not stage disposable restore inventory')
        with archive.open('rb') as handle:
            restore = subprocess.run(['docker','exec','-i',db.CONTAINER,
                         'pg_restore','-U','postgres','-d',target,'--no-owner',
                         '--exit-on-error','--single-transaction','--use-list='+name],
                         stdin=handle,capture_output=True)
        if restore.returncode:
            report = private / ('phase4_restore_error_' + secrets.token_hex(6) + '.log')
            with report.open('xb') as out:
                os.chmod(report,0o600)
                out.write(restore.stderr)
            raise RuntimeError(
                f'Isolated pg_restore exit {restore.returncode}; private error log: {report} '
                '(redact sensitive information before sharing)')
        print(f'PASS: isolated restore retained object ACLs and excluded {omitted} managed/default ACL entries')
        return omitted
    finally:
        clean = subprocess.run(['docker','exec',db.CONTAINER,'rm','-f',name],capture_output=True)
        if clean.returncode:
            raise RuntimeError('Could not remove private restore inventory from disposable container')


def main() -> None:
    db.verify_local()
    extension_schema = verify_inventory()

    base = Path(os.environ.get('PUZZLE_PHASE3_BACKUP_DIR',
             str(Path.home() / 'puzzle-league-private-backups'))).expanduser().resolve()
    if base == ROOT or ROOT in base.parents or base.is_symlink():
        raise RuntimeError('Refusing backup directory inside repository or symlink')
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    if base.stat().st_mode & 0o077:
        raise RuntimeError('Backup directory must be private (chmod 700)')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '_' + secrets.token_hex(3)
    full = base / f'phase4_local_full_{stamp}.dump'
    app = base / f'phase4_local_app_{stamp}.dump'
    cmd = ['docker', 'exec', db.CONTAINER, 'pg_dump', '-U', 'postgres',
           '-d', 'postgres', '--format=custom', '--no-owner']
    print('Making private full and application-schema archives (no DB reset)')
    stream_to_file(cmd, full)
    stream_to_file(cmd + ['--schema=public', '--schema=app_private'], app)
    before = fingerprints()
    clone = 'phase4_restore_' + secrets.token_hex(6)
    if not re.fullmatch(r'phase4_restore_[a-f0-9]{12}', clone):
        raise RuntimeError('Unexpected disposable target name')
    created = False
    try:
        db.run(['docker','exec',db.CONTAINER,'createdb','-U','postgres',
                '--template=template0',clone])
        created = True
        db_sql(clone, """
          create schema auth;
          create table auth.users(id uuid primary key);
          create function auth.uid() returns uuid language sql stable as
          $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        """)
        # Only surrogate ids: no credentials/email/personal profile data from Auth.
        ids = db_sql('postgres', '''
          select id from auth.users
          where id in (select id from public.profiles)
          order by id;
        ''')
        from uuid import UUID
        for uid in ids.splitlines():
            db_sql(clone, f"insert into auth.users(id) values ('{UUID(uid)}'::uuid);")
        db_sql(clone, 'drop schema public cascade;')  # ONLY new disposable target
        # Phase 4 exclusion constraint uses uuid GiST operator family from btree_gist.
        # The --schema= app dump excludes this extension because it belongs to
        # a separate schema, so rebuild it on the disposable database first.
        if extension_schema == 'extensions':
            db_sql(clone, 'create schema extensions; create extension btree_gist with schema extensions;')
        else:
            db_sql(clone, 'create schema public; create extension btree_gist with schema public;')
        print('PASS: isolated target prepared with required btree_gist extension')
        restore_application_archive(app, clone, extension_schema, base)
        after = fingerprints(clone)
        for item in before:
            if before[item] != after.get(item):
                raise RuntimeError(f'Isolated restore fingerprint mismatch: {item}')
        restored_rls = db_sql(clone, '''
          select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname in ('public','app_private')
          and c.relkind in ('r','p') and c.relrowsecurity;
        ''')
        if restored_rls != str(len(APP_TABLES)):
            raise RuntimeError('Isolated restore does not preserve all 20 RLS flags')
        grants = db_sql(clone, """
          select
          has_table_privilege('anon','public.games','SELECT')::int::text || '|' ||
          has_table_privilege('authenticated','public.leagues','SELECT')::int::text || '|' ||
          has_table_privilege('authenticated','public.result_submissions','SELECT')::int::text || '|' ||
          has_table_privilege('anon','app_private.result_audit_events','SELECT')::int::text || '|' ||
          has_table_privilege('authenticated','public.league_score_entries','INSERT')::int::text || '|' ||
          has_table_privilege('anon','app_private.competition_events','SELECT')::int::text;
        """)
        if grants != '1|1|0|0|0|0':
            raise RuntimeError('Restored existing-object grants are incomplete or unsafe')
        migration_count = db_sql('postgres',
            'select count(*) from supabase_migrations.schema_migrations;')
        print(f'PASS: Phase 4 isolated restore + fingerprints across {len(APP_TABLES)} tables')
        print(f'PASS: restored app-table RLS and selected grant boundaries; source migrations {migration_count}')
        print(f'PRIVATE BACKUPS: {full.name} SHA256 {db.sha256(full)}')
        print(f'PRIVATE APP BACKUP: {app.name} SHA256 {db.sha256(app)}')
        db.run(['docker','exec',db.CONTAINER,'dropdb','-U','postgres',clone])
        created = False
    except Exception:
        if created:
            print(f'WARNING: isolated restore target {clone} retained for diagnosis (never production)',
                  file=sys.stderr)
        raise
    print('PHASE 4 BACKUP / ISOLATED RESTORE: PASS')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'PHASE 4 BACKUP / ISOLATED RESTORE: FAIL: {exc}', file=sys.stderr)
        sys.exit(1)
