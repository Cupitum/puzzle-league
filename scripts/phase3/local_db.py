"""Phase 3 local-only Postgres helpers. Never log Supabase keys or DB contents."""
from __future__ import annotations

import hashlib
import os
import re
import subprocess
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = tomllib.loads((ROOT / 'supabase/config.toml').read_text())
PROJECT = CONFIG['project_id']
if not re.fullmatch(r'[A-Za-z0-9_-]+', PROJECT):
    raise RuntimeError('Unsafe project_id')
CONTAINER = f'supabase_db_{PROJECT}'
TABLES = [('public', n) for n in ('profiles', 'games', 'leagues', 'league_memberships',
                                 'game_puzzles', 'result_submissions')] + [
    ('app_private', n) for n in ('league_moderator_delegations', 'approval_requests',
                               'approval_decisions', 'result_audit_events')]


def run(args, *, input=None, binary=False, check=True):
    result = subprocess.run(args, cwd=ROOT, input=input, capture_output=True,
                            text=not binary, check=False)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} failed with exit {result.returncode}; inspect local logs (output suppressed)')
    return result.stdout


def verify_local():
    running = run(['docker', 'ps', '--format', '{{.Names}}']).splitlines()
    if CONTAINER not in running:
        raise RuntimeError('Exact local Supabase DB container is not running')
    return CONTAINER


def psql(query: str, database='postgres'):
    if not re.fullmatch(r'[a-z][a-z0-9_]{0,62}', database):
        raise RuntimeError('Unsafe target database')
    return run(['docker','exec',CONTAINER,'psql','-X','-U','postgres',
                '-d',database,'-v','ON_ERROR_STOP=1','-At','-c',query]).strip()


def fingerprints(database='postgres'):
    output = {}
    for schema, table in TABLES:
        query = (f"select count(*)::text || '|' || "
                 f"coalesce(md5(string_agg(row_to_json(t)::text, E'\\n' "
                 f"order by row_to_json(t)::text)), md5('')) "
                 f'from "{schema}"."{table}" t;')
        output[f'{schema}.{table}'] = psql(query, database)
    return output


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()
