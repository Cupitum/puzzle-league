#!/usr/bin/env python3
"""Real local Auth JWT + PostgREST/RPC adversarial checks; no service-role key.

Fixtures are deleted even after failed tests. Immutable, content-free audit events
from real moderator grants remain intentionally preserved in local dev DB.
"""
from __future__ import annotations

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
sys.path.insert(0, str(ROOT / 'scripts' / 'phase3'))
from local_db import CONTAINER, psql, run, verify_local


def status_env():
    result = run(['npx','--no-install','supabase','status','-o','env'])
    env = {}
    for line in result.splitlines():
        match = re.fullmatch(r'([A-Z_]+)=(?:"([^"]*)"|([^\s]*))', line.strip())
        if match:
            env[match.group(1)] = match.group(2) if match.group(2) is not None else match.group(3)
    return env


def api(base, apikey, path, method='GET', payload=None, token=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {'apikey': apikey, 'Accept':'application/json', 'Content-Type':'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    elif apikey.count('.') == 2:
        # Legacy local ANON_KEY is a JWT; public-role requests stay anonymous.
        headers['Authorization'] = 'Bearer ' + apikey
    req = urllib.request.Request(base+path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode()
            return resp.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as e:
        e.read()  # Never echo potentially sensitive response JSON.
        return e.code, None


def require_rows(base, key, token, path, expected):
    status, obj = api(base,key,path,token=token)
    if status != 200 or not isinstance(obj,list):
        raise AssertionError(f'GET {path.split("?")[0]} failed HTTP {status}')
    ids = {row['id'] for row in obj}
    if ids != set(map(str, expected)):
        raise AssertionError(f'RLS mismatch for {path.split("?")[0]} (counts {len(ids)}/{len(expected)})')


def expect_denied(base,key,token,path,method='POST',payload=None):
    status,_ = api(base,key,path,method,payload,token)
    if 200 <= status < 300:
        raise AssertionError(f'Unexpected successful {method} on {path.split("?")[0]}')


def main():
    verify_local()
    env = status_env()
    base = env.get('API_URL','').rstrip('/')
    host = urllib.parse.urlsplit(base).hostname
    if host not in ('localhost','127.0.0.1','::1'):
        raise RuntimeError('Refusing non-local API URL')
    key = env.get('ANON_KEY') or env.get('PUBLISHABLE_KEY')
    if not key: raise RuntimeError('Local anon/publishable key unavailable')
    users = {}
    leagues = []
    memberships = []
    cleanup_errors = []
    nonce = uuid.uuid4().hex
    password = secrets.token_urlsafe(24) + 'A1!'
    try:
        for who in ('owner','member','moderator','outsider','former'):
            email = f'phase3-{nonce}-{who}@example.com'
            status,created = api(base,key,'/auth/v1/signup','POST',
                                 {'email':email,'password':password})
            if status not in (200,201) or not created:
                raise AssertionError(f'Auth signup failed for {who}: {status}')
            user_data = created.get('user') or created
            uid = str(uuid.UUID(user_data['id']))
            users[who] = {'id':uid, 'email':email, 'token':None}
            status,logged = api(base,key,'/auth/v1/token?grant_type=password','POST',
                                {'email':email,'password':password})
            if status != 200 or not logged or not logged.get('access_token'):
                raise AssertionError(f'Auth password flow failed for {who}: {status}')
            users[who]['token']=logged['access_token']
            status,auth_info=api(base,key,'/auth/v1/user',token=users[who]['token'])
            if status != 200 or not auth_info or auth_info.get('id') != uid:
                raise AssertionError(f'JWT did not authenticate {who}')
        print('PASS: 5 distinct disposable real Auth/JWT sessions')

        for who in ('owner','outsider'):
            leagues.append(str(uuid.uuid4()))
        public_league = str(uuid.uuid4())
        leagues.append(public_league)
        private_owner, private_other = leagues[0], leagues[1]
        owner, outsider = users['owner']['id'], users['outsider']['id']
        psql('insert into public.leagues(id,owner_user_id,name,visibility,time_zone) values '
             f"('{private_owner}'::uuid,'{owner}'::uuid,'Phase3 HTTP private','private','Africa/Johannesburg'),"
             f"('{private_other}'::uuid,'{outsider}'::uuid,'Phase3 HTTP foreign','private','Africa/Johannesburg'),"
             f"('{public_league}'::uuid,'{owner}'::uuid,'Phase3 HTTP public','public','Africa/Johannesburg');")
        for who in ('member','moderator','former'):
            mid = str(uuid.uuid4())
            memberships.append(mid)
            left_at = 'now()' if who=='former' else 'null'
            psql('insert into public.league_memberships(id,league_id,user_id,role,left_at) values '
                 f"('{mid}'::uuid,'{private_owner}'::uuid,'{users[who]['id']}'::uuid,'member',{left_at});")
        print('PASS: fixture leagues, active and former membership created')
        q='/rest/v1/leagues?select=id&id=in.('+','.join(leagues)+')'
        r='/rest/v1/league_memberships?select=id&id=in.('+','.join(memberships)+')'
        self_q='/rest/v1/profiles?select=id'
        require_rows(base,key,None,q,[public_league])
        expect_denied(base,key,None,'/rest/v1/profiles?select=id')
        expect_denied(base,key,None,'/rest/v1/league_memberships?select=id')
        expect_denied(base,key,None,'/rest/v1/result_submissions?select=id')
        for who,allowed in (
            ('owner',[private_owner,public_league]),
            ('member',[private_owner,public_league]),
            ('moderator',[private_owner,public_league]),
            ('former',[public_league]),
            ('outsider',[private_other,public_league])):
            token=users[who]['token']
            require_rows(base,key,token,q,allowed)
            require_rows(base,key,token,self_q,[users[who]['id']])
        require_rows(base,key,users['owner']['token'],r,memberships[:2])
        for who,expected in (('member',[memberships[0]]),
                             ('moderator',[memberships[1]]),('former',[memberships[2]]),
                             ('outsider',[])):
            require_rows(base,key,users[who]['token'],r,expected)
        print('PASS: anonymous/public, private ownership/membership, self profile/history, cross-league isolation')

        promote = '/rest/v1/rpc/set_league_moderator'
        delegate = '/rest/v1/rpc/set_league_moderator_permission'
        promote_payload={'p_league_id':private_owner,
                         'p_member_user_id':users['moderator']['id'],'p_is_moderator':True}
        delegate_payload={'p_league_id':private_owner,
                          'p_member_user_id':users['moderator']['id'],
                          'p_permission_name':'view_member_roster','p_enabled':True}
        for token in (None,users['member']['token'],users['outsider']['token']):
            expect_denied(base,key,token,promote,payload=promote_payload)
            expect_denied(base,key,token,delegate,payload=delegate_payload)
        st,_ = api(base,key,promote,'POST',promote_payload,users['owner']['token'])
        if st not in (200,204): raise AssertionError(f'Owner promotion failed {st}')
        require_rows(base,key,users['moderator']['token'],r,[memberships[1]])
        expect_denied(base,key,users['moderator']['token'],delegate,payload=delegate_payload)
        expect_denied(base,key,users['owner']['token'],delegate,payload={**delegate_payload,'p_permission_name':'delete_results'})
        st,_ = api(base,key,delegate,'POST',delegate_payload,users['owner']['token'])
        if st not in (200,204): raise AssertionError(f'Owner delegation failed {st}')
        require_rows(base,key,users['moderator']['token'],r,memberships[:2])
        require_rows(base,key,users['moderator']['token'],q,[private_owner,public_league])
        st,_ = api(base,key,delegate,'POST',{**delegate_payload,'p_enabled':False},users['owner']['token'])
        if st not in (200,204): raise AssertionError('Owner revoke failed')
        require_rows(base,key,users['moderator']['token'],r,[memberships[1]])
        st,_ = api(base,key,delegate,'POST',delegate_payload,users['owner']['token'])
        if st not in (200,204): raise AssertionError('Owner re-delegation failed')
        st,_ = api(base,key,promote,'POST',{**promote_payload,'p_is_moderator':False},users['owner']['token'])
        if st not in (200,204): raise AssertionError('Owner demotion failed')
        st,_ = api(base,key,promote,'POST',promote_payload,users['owner']['token'])
        if st not in (200,204): raise AssertionError('Owner re-promotion failed')
        require_rows(base,key,users['moderator']['token'],r,[memberships[1]])
        print('PASS: HTTP owner-only RPCs, explicit delegation, self-grant denial, revoke/demotion and isolation')

        for who in ('owner','member','moderator','outsider','former'):
            token=users[who]['token']
            for table,payload in (
                ('profiles',{'id':users[who]['id'],'nickname':'injected'}),
                ('games',{'id':'injected','display_name':'bad','approved_rule_version':'bad'}),
                ('leagues',{'name':'bad'}),
                ('league_memberships',{'role':'moderator'}),
                ('game_puzzles',{'mode':'daily'}),
                ('result_submissions',{'raw_share_text':'injected'}),
            ):
                path='/rest/v1/'+table
                expect_denied(base,key,token,path,'POST',payload)
                expect_denied(base,key,token,path+'?id=eq.'+str(uuid.uuid4()),'PATCH',payload)
                expect_denied(base,key,token,path+'?id=eq.'+str(uuid.uuid4()),'DELETE')
            for private_table in ('approval_requests','approval_decisions','result_audit_events'):
                expect_denied(base,key,token,'/rest/v1/'+private_table)
            expect_denied(base,key,token,'/rest/v1/rpc/record_security_event')
        expect_denied(base,key,None,promote,payload=promote_payload)
        # Also exercise anonymous HTTP write denial, not just SQL GRANT metadata.
        for table in ('profiles','games','leagues','league_memberships',
                      'game_puzzles','result_submissions'):
            path='/rest/v1/'+table
            expect_denied(base,key,None,path,'POST',{'id':str(uuid.uuid4())})
            expect_denied(base,key,None,path+'?id=eq.'+str(uuid.uuid4()),'PATCH',{'name':'bad'})
            expect_denied(base,key,None,path+'?id=eq.'+str(uuid.uuid4()),'DELETE')
        print('PASS: signed-JWT forbidden DML, protected approval/audit objects and hidden helper RPC')
    finally:
        # Clean in FK order, preserving deliberately immutable role audit events.
        if memberships:
            mids=','.join("'"+str(uuid.UUID(m))+"'" for m in memberships)
            try:
                psql(f'delete from app_private.league_moderator_delegations where membership_id in ({mids});')
                psql(f'delete from public.league_memberships where id in ({mids});')
            except Exception as exc:
                cleanup_errors.append('membership cleanup')
                print('WARNING: membership cleanup failed:',exc,file=sys.stderr)
        if leagues:
            ids=','.join("'"+str(uuid.UUID(l))+"'" for l in leagues)
            try: psql(f'delete from public.leagues where id in ({ids});')
            except Exception as exc:
                cleanup_errors.append('league cleanup')
                print('WARNING: league cleanup failed:',exc,file=sys.stderr)
        for u in users.values():
            try: psql(f"delete from auth.users where id='{uuid.UUID(u['id'])}'::uuid;")
            except Exception as exc:
                cleanup_errors.append('Auth fixture cleanup')
                print('WARNING: Auth fixture cleanup failed:',exc,file=sys.stderr)
    if not cleanup_errors:
        for mid in memberships:
            if psql(f"select count(*) from public.league_memberships where id='{uuid.UUID(mid)}'::uuid;") != '0':
                cleanup_errors.append('membership residue')
        for league in leagues:
            if psql(f"select count(*) from public.leagues where id='{uuid.UUID(league)}'::uuid;") != '0':
                cleanup_errors.append('league residue')
        for u in users.values():
            if psql(f"select count(*) from auth.users where id='{uuid.UUID(u['id'])}'::uuid;") != '0':
                cleanup_errors.append('Auth residue')
    if cleanup_errors:
        raise RuntimeError('Security fixture cleanup incomplete; inspect local DB')
    print('PHASE 3 REAL JWT/POSTGREST SECURITY: PASS')


if __name__ == '__main__':
    try: main()
    except Exception as exc:
        print(f'PHASE 3 REAL JWT/POSTGREST SECURITY: FAIL ({type(exc).__name__}): {exc}',file=sys.stderr)
        sys.exit(1)
