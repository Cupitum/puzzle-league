#!/usr/bin/env python3
"""Safe local PostgreSQL backup and *isolated* application-schema restore.

Backups contain sensitive raw bytes: store on an encrypted disk in chmod-700
private folder. The full DB dump is recovery material; the test restores the
Puzzle League app schemas/data, not managed Supabase Auth/Storage internals.
"""
from __future__ import annotations

import os
import re
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

from local_db import CONTAINER, ROOT, TABLES, fingerprints, psql, run, sha256, verify_local


def stream_to_file(cmd, dest):
    # pg_dump emits binary stdout; suppress stderr potentially revealing metadata.
    import subprocess
    with open(dest, 'xb') as handle:
        os.chmod(dest, 0o600)
        p = subprocess.run(cmd, cwd=ROOT, stdout=handle, stderr=subprocess.PIPE)
    if p.returncode:
        dest.unlink(missing_ok=True)
        raise RuntimeError(f'pg_dump failed (exit {p.returncode}); inspect local PostgreSQL logs')
    if dest.stat().st_size < 1024:
        raise RuntimeError('Backup is suspiciously small')


def db_exec(db, query):
    return psql(query,db)


def restore_application_archive(archive: Path, target: str) -> int:
    """Skip nonportable DEFAULT ACL entries while keeping object ACLs and data.

    Local Supabase owns some default privilege definitions as supabase_admin.
    The postgres restore role cannot ALTER DEFAULT PRIVILEGES FOR that role.
    Such entries control future objects, not grants on restored objects.
    Application-object GRANT/REVOKE entries are deliberately *not* omitted.
    """
    import subprocess

    with archive.open('rb') as handle:
        inventory = subprocess.run(
            ['docker', 'exec', '-i', CONTAINER, 'pg_restore', '--list'],
            stdin=handle, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if inventory.returncode:
        raise RuntimeError('Could not read the application archive inventory')

    toc = inventory.stdout.decode('utf-8', errors='replace')
    if 'TABLE DATA' not in toc:
        raise RuntimeError('Archive inventory is missing table data')
    lines = []
    omitted = 0
    for line in toc.splitlines(keepends=True):
        if re.match(r'^\d+;\s+\d+\s+\d+\s+DEFAULT ACL(?:\s|$)', line):
            # PostgreSQL TOC list files comment out omitted entries with ';'.
            lines.append(';' + line)
            omitted += 1
        else:
            lines.append(line)

    # A random, per-execution list file is used only inside the local DB container.
    # The archive is still streamed to pg_restore, never copied to the container.
    toc_path = '/tmp/puzzle_phase3_restore_' + secrets.token_hex(10) + '.list'
    try:
        write = subprocess.run(
            ['docker', 'exec', '-i', CONTAINER, 'sh', '-c',
             'umask 077; cat > ' + toc_path],
            input=''.join(lines).encode('utf-8'),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if write.returncode:
            raise RuntimeError('Failed to create private restore inventory in container')

        with archive.open('rb') as handle:
            restore = subprocess.run(
                ['docker', 'exec', '-i', CONTAINER, 'pg_restore', '-U', 'postgres',
                 '-d', target, '--no-owner', '--exit-on-error',
                 '--single-transaction', '--use-list=' + toc_path],
                stdin=handle, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if restore.returncode:
            raise RuntimeError(
                f'Isolated pg_restore failed with exit {restore.returncode}; '
                'clone retained for investigation')
        print(f'PASS: isolated restore excluded {omitted} managed/default privilege '
              'definition(s), retained existing-object ACLs')
        return omitted
    finally:
        remove = subprocess.run(
            ['docker', 'exec', CONTAINER, 'rm', '-f', toc_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if remove.returncode:
            raise RuntimeError('Failed to remove temporary restore inventory')


def main():
    verify_local()
    base = Path(os.environ.get('PUZZLE_PHASE3_BACKUP_DIR',
                               str(Path.home()/'puzzle-league-private-backups'))).expanduser().resolve()
    if base == ROOT or ROOT in base.parents:
        raise RuntimeError('Refusing backups inside source repository')
    base.mkdir(parents=True,exist_ok=True,mode=0o700)
    if base.is_symlink() or (base.stat().st_mode & 0o077):
        raise RuntimeError('Backup directory must be private (chmod 700) and not a symlink')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '_' + secrets.token_hex(3)
    full = base/f'phase3_local_full_{stamp}.dump'
    app = base/f'phase3_local_app_{stamp}.dump'
    full_cmd = ['docker','exec',CONTAINER,'pg_dump','-U','postgres','-d','postgres',
                '--format=custom','--no-owner']
    app_cmd = full_cmd + ['--schema=public','--schema=app_private']
    print('Making complete local-db archive (private directory; no DB reset)')
    stream_to_file(full_cmd, full)
    if '--backup-only' in sys.argv:
        print(f'PASS: private complete-db backup {full.name} SHA256 {sha256(full)}')
        print('BACKUP-ONLY: not a restore verification')
        return
    print('Making application-schema archive for independently checkable restore')
    stream_to_file(app_cmd, app)
    source = fingerprints()
    clone = 'phase3_restore_'+secrets.token_hex(5)
    if not re.fullmatch(r'phase3_restore_[a-f0-9]{10}',clone):
        raise RuntimeError('Unsafe clone name')
    created=False
    try:
        run(['docker','exec',CONTAINER,'createdb','-U','postgres','--template=template0',clone])
        created=True
        db_exec(clone, 'create schema auth; create table auth.users(id uuid primary key); '
                       'create function auth.uid() returns uuid language sql stable as '
                       "$$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;")
        # Only surrogate ID references are cloned for app-data FK verification.
        # No hashed passwords/emails are copied into the restore sandbox.
        ids = psql('select id from auth.users where id in (select id from public.profiles) order by id;')
        for line in ids.splitlines():
            from uuid import UUID
            uid = str(UUID(line))
            db_exec(clone, f"insert into auth.users(id) values ('{uid}'::uuid);")
        db_exec(clone,'drop schema public cascade;')  # ONLY on unique disposable DB
        # Restore only to the disposable clone; preserve original object grants.
        # Supabase-managed default privileges cannot be replayed by postgres.
        restore_application_archive(app, clone)
        restored = fingerprints(clone)
        for table in source:
            if source[table] != restored.get(table):
                raise RuntimeError(f'Isolated restore fingerprint mismatch: {table}')
        # Existing object grants and RLS must survive this app-schema restore;
        # server-managed DEFAULT ACLs for future objects are excluded.
        rls = db_exec(clone, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind='r' and c.relrowsecurity;")
        if rls != str(len(TABLES)):
            raise RuntimeError(f'Isolated restored RLS metadata incomplete ({rls}/{len(TABLES)})')
        grants = db_exec(clone, "select "
            "has_table_privilege('anon','public.games','SELECT')::int::text || '|' || "
            "has_table_privilege('authenticated','public.leagues','SELECT')::int::text || '|' || "
            "has_table_privilege('authenticated','public.result_submissions','SELECT')::int::text || '|' || "
            "has_table_privilege('anon','app_private.result_audit_events','SELECT')::int::text;")
        if grants != '1|1|0|0':
            raise RuntimeError('Restored existing-object grants are incomplete or unsafe')
        migration_count = psql('select count(*) from supabase_migrations.schema_migrations;')
        print(f'PASS: isolated app-schema restore + data fingerprints across {len(source)} tables')
        print(f'PASS: migration history available in source DB ({migration_count} registered)')
        print(f'PRIVATE BACKUPS: {full.name} SHA256 {sha256(full)}')
        print(f'PRIVATE APP BACKUP: {app.name} SHA256 {sha256(app)}')
        # Remove *only* the isolated clone created by this process.
        run(['docker','exec',CONTAINER,'dropdb','-U','postgres',clone])
        created=False
    except Exception:
        if created:
            print(f'WARNING: isolated restore target {clone} retained for diagnosis (never production).',
                  file=sys.stderr)
        raise
    print('PHASE 3 BACKUP / ISOLATED RESTORE: PASS')


if __name__=='__main__':
    try: main()
    except Exception as exc:
        print(f'PHASE 3 BACKUP / ISOLATED RESTORE: FAIL: {exc}',file=sys.stderr)
        sys.exit(1)
