#!/usr/bin/env python3
"""Local-only Phase 3 Block 2 Step 4 Auth HTTP / profile smoke test.

Uses Supabase CLI's local publishable/anon key, never prints credentials,
creates a disposable Auth user, checks the profile directly through the local
Docker PostgreSQL container, and deletes the user in a finally block.
"""

import json
import re
import secrets
import subprocess
import sys
import tomllib
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run(*cmd):
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"Command failed: {cmd[0]} (exit {result.returncode}). Check local services.")
    return result.stdout


def status_env():
    stdout = run('npx', '--no-install', 'supabase', 'status', '-o', 'env')
    result = {}
    for line in stdout.splitlines():
        match = re.fullmatch(r'([A-Z_]+)=(?:"([^"]*)"|([^\s]*))', line.strip())
        if match:
            result[match.group(1)] = match.group(2) if match.group(2) is not None else match.group(3)
    return result


def request(base, key, path, method='GET', payload=None, token=None):
    headers = {'apikey': key, 'Content-Type': 'application/json'}
    if token is not None:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'Local Auth HTTP {method} {path.split("?")[0]} returned HTTP {exc.code}; inspect local Auth logs. Response not printed to protect credentials.') from None


def sql(container, statement):
    # SQL statements only contain an API-returned, validated UUID.
    return run('docker', 'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres',
               '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', statement).strip()


def main():
    cfg = tomllib.loads((ROOT / 'supabase' / 'config.toml').read_text())
    project_id = cfg['project_id']
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', project_id):
        raise RuntimeError('Unexpected project_id in local config')
    container = f'supabase_db_{project_id}'
    running = run('docker', 'ps', '--format', '{{.Names}}').splitlines()
    if container not in running:
        raise RuntimeError(f'Expected local database container {container} is not running')
    env = status_env()
    base = env.get('API_URL', '').rstrip('/')
    key = env.get('ANON_KEY') or env.get('PUBLISHABLE_KEY')
    host = urllib.parse.urlsplit(base).hostname
    if host not in {'127.0.0.1', 'localhost', '::1'} or not key:
        raise RuntimeError('Local-only API URL or public Auth key unavailable; refusing remote test')

    password = secrets.token_urlsafe(24) + 'Aa1!'
    email = f'puzzle-league-step4-{uuid.uuid4().hex}@example.com'
    user_id = None
    try:
        signed_up = request(base, key, '/auth/v1/signup', 'POST', {
            'email': email, 'password': password,
            'data': {'nickname': 'PRIVATE-SIGNUP-DATA'}
        })
        user_data = signed_up.get('user') or signed_up
        user_id = uuid.UUID(user_data['id'])
        print('PASS: real HTTP signup created an Auth user')

        logged_in = request(base, key, '/auth/v1/token?grant_type=password', 'POST', {
            'email': email, 'password': password
        })
        token = logged_in.get('access_token')
        if not token:
            raise RuntimeError('Password login did not return an access token')
        current_user = request(base, key, '/auth/v1/user', token=token)
        if uuid.UUID(current_user['id']) != user_id:
            raise RuntimeError('Logged-in Auth identity mismatch')
        print('PASS: real password sign-in and authenticated /auth/v1/user')

        profile = sql(container, f"select nickname from public.profiles where id = '{user_id}'::uuid;")
        expected = 'Player-' + user_id.hex[:12]
        if profile != expected or email in profile or 'PRIVATE' in profile:
            raise RuntimeError('Auth-linked profile missing or contains incorrect/private nickname')
        print('PASS: exactly linked, email-free public profile created')

    finally:
        if user_id is not None:
            try:
                removed = sql(container, f"delete from auth.users where id = '{user_id}'::uuid returning id;")
                if str(user_id) not in removed:
                    raise RuntimeError('Delete did not return created Auth user')
                remains = sql(container, f"select count(*) from public.profiles where id = '{user_id}'::uuid;")
                if remains != '0':
                    raise RuntimeError('Public profile still exists after user deletion')
                print('PASS: disposable test user and profile deleted')
            except Exception as exc:
                print(f'WARNING: cleanup failed for test user {user_id}: {exc}', file=sys.stderr)
                raise

    print('STEP 4 HTTP AUTH / PROFILE SMOKE TEST: PASS')


if __name__ == '__main__':
    try:
        main()
    except (KeyError, ValueError, RuntimeError, OSError, urllib.error.URLError) as exc:
        print(f'STEP 4 HTTP AUTH / PROFILE SMOKE TEST: FAIL — {exc}', file=sys.stderr)
        sys.exit(1)
