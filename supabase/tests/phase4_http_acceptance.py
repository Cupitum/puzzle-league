#!/usr/bin/env python3
"""Local-only real JWT → Edge → service-only RPC acceptance.

Uses randomly named synthetic Auth users and puzzles, and removes its own DB rows.
Append-only anonymised Phase 3/4 audit events intentionally survive. This is NOT
an official proof that the synthetic Wordle puzzle was ever released.
"""
from __future__ import annotations
import json, secrets, subprocess, sys, urllib.parse, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'supabase'/'tests'))
sys.path.insert(0,str(ROOT/'scripts'/'phase3'))
from phase3_real_jwt_http_security import status_env,api
from local_db import psql,verify_local

def must(test,message):
    if not test: raise AssertionError(message)

def quote(value):
    # Only generated UUIDs/integers reach SQL; no user-controlled strings.
    return "'"+str(value).replace("'","''")+"'"

def run():
    verify_local()
    env=status_env();base=env.get('API_URL','').rstrip('/')
    must(urllib.parse.urlparse(base).hostname in ('localhost','127.0.0.1','::1'), 'Local API required')
    key=env.get('ANON_KEY') or env.get('PUBLISHABLE_KEY')
    must(bool(key),'Local publishable key unavailable')
    nonce=uuid.uuid4().hex; password=secrets.token_urlsafe(24)+'Aa1!'
    users={};league=None;season=None;result=None;member_id=None;test_puzzle=str(secrets.randbelow(8000000)+90000000)
    # Maintain direct cleanup ordering even if an assertion fails; never drop an unrelated table.
    try:
        for role in ('owner','member','outsider'):
            email=f'p4-{nonce}-{role}@example.invalid'
            code,created=api(base,key,'/auth/v1/signup','POST',{'email':email,'password':password})
            must(code in (200,201) and bool(created),'Auth signup failed')
            uid=str(uuid.UUID((created.get('user') or created)['id']))
            users[role]={'id':uid}
            code,logged=api(base,key,'/auth/v1/token?grant_type=password','POST',
                {'email':email,'password':password})
            must(code==200 and logged and logged.get('access_token'),'Login failed')
            users[role]['token']=logged['access_token']
        print('PASS: 3 real signed-in JWTs, no credentials printed')
        def action(role,act,data):
            return api(base,key,'/functions/v1/competition','POST',{'action':act,'data':data},
                       token=users[role]['token'])
        c,_=api(base,key,'/functions/v1/competition','POST',{'action':'my_history','data':{}})
        must(c in (401,403),'Unauthenticated request should be denied')
        c,res=action('owner','create_league',{'name':'P4 Test '+nonce[:6],
             'visibility':'private','time_zone':'Africa/Johannesburg'})
        must(c==200 and res.get('ok'),'League creation failed')
        league=res['result']['league_id']
        c,_=action('outsider','join',{'league_id':league})
        must(c>=400,'Outsider entered private league without invite')
        c,res=action('owner','invite',{'league_id':league})
        must(c==200,'Invitation issue failed')
        invite=res['result']['invite_token']
        c,res=action('member','join',{'invite_token':invite})
        must(c==200,'Invite join failed')
        member_id=res['result']['membership_id']
        c,_=action('outsider','join',{'invite_token':invite})
        must(c>=400,'One-use invite reused')
        print('PASS: private league, invitation, one-use join and outsider denial')
        c,res=action('owner','start_season',{'league_id':league,'cadence':'calendar_month',
           'games':['wordle','minute_cryptic','foximax','polygonle','krillion']})
        must(c==200,'First season failed')
        season=res['result']['season_id']
        code,_=api(base,key,'/rest/v1/league_score_entries','POST',
                   {'game_id':'wordle'},token=users['member']['token'])
        must(code>=400,'Direct score write was permitted')
        c,_=action('outsider','standings',{'season_id':season})
        must(c>=400,'Private standings leaked to outsider')
        print('PASS: server-only writes and private season isolation')
        # Independently labelled SYNTHETIC operator fixture, *not* verified real game history.
        day=psql("select (now() at time zone 'Africa/Johannesburg')::date::text;").strip().splitlines()[-1]
        psql("select app_private.p4_operator_verify_puzzle('wordle',"+quote(test_puzzle)+","+
             quote(day)+"::date,'Synthetic local HTTP acceptance fixture only');")
        source=f'Wordle {test_puzzle} 1/6\n🟩🟩🟩🟩🟩'
        c,res=action('member','submit',{'raw_text':source,'method':'paste',
                  'game':'foximax','status':'accepted','performance_points':999})
        must(c==200,'Signed-in submission failed')
        result=res['result']['submission_id']
        must(res['result']['awarded']==1,'Verified, eligible synthetic fixture not awarded')
        c,dup=action('member','submit',{'raw_text':source,'method':'paste'})
        must(c==200 and dup['result']['duplicate'] and dup['result']['awarded']==0,
             'Repeat share was not idempotent')
        c,board=action('member','standings',{'season_id':season})
        must(c==200 and board['result']['combined'][0]['total']==11,'Combined standings inaccurate')
        must(board['result']['by_game'][0]['total']==11,'Per-game standings inaccurate')
        must('account_id' not in str(board),'Public/login identifier leaked')
        print('PASS: server parser ignores forged client points; 1/6 = 11, duplicate safe, standings')
    finally:
        # Delete ONLY this invocation's fixture rows, preserving immutable audit events.
        # Auth users may be removed only after their owned/linked rows are deleted.
        if result:
            psql('delete from public.league_score_entries where submission_id='+quote(result)+'::uuid;')
            psql('delete from public.result_submissions where id='+quote(result)+'::uuid;')
        if league:
            psql('delete from app_private.league_invitations where league_id='+quote(league)+'::uuid;')
            psql('delete from app_private.league_review_delegations where membership_id in '
                 '(select id from public.league_memberships where league_id='+quote(league)+'::uuid);')
            psql('delete from app_private.league_moderator_delegations where membership_id in '
                 '(select id from public.league_memberships where league_id='+quote(league)+'::uuid);')
            psql('delete from public.league_memberships where league_id='+quote(league)+'::uuid;')
            psql('delete from public.season_game_settings where season_id in '
                 '(select id from public.league_seasons where league_id='+quote(league)+'::uuid);')
            psql('delete from public.league_seasons where league_id='+quote(league)+'::uuid;')
            psql('delete from public.leagues where id='+quote(league)+'::uuid;')
        psql("delete from public.game_puzzles where game_id='wordle' and identity_key="+quote(test_puzzle)+";")
        for u in users.values():
            psql('delete from auth.users where id='+quote(u['id'])+'::uuid;')
        print('PASS: scoped synthetic DB/Auth cleanup; immutable anonymised audit retained')
    print('PHASE 4 REAL JWT / EDGE / POSTGREST: PASS')
if __name__=='__main__':
    try:run()
    except Exception as e:
        print('PHASE 4 REAL JWT / EDGE / POSTGREST: FAIL — '+type(e).__name__+' (details redacted)',file=sys.stderr)
        raise SystemExit(1)
