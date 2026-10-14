#!/usr/bin/env python3
"""Hard stop before local forward-only migrations; no reset, no external connections."""
from __future__ import annotations
import sys,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'/'phase3'))
from local_db import verify_local,psql
BASE='9b5a40a56b4f4cf3ad71f765fc913e3e94ed02d4'
PHASE3={'20261012170000','20261013220000','20261013220100','20261013220200','20261014150000'}
PHASE4={'20261015100000','20261015100100','20261015100200','20261015100300'}
def run():
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    if head!=BASE: raise RuntimeError('Git HEAD is not 9b5a40a: stop and reconcile source history')
    verify_local()
    registered=set(psql('select version from supabase_migrations.schema_migrations;').splitlines())
    if not PHASE3.issubset(registered) or registered-PHASE3-PHASE4:
        raise RuntimeError('Unexpected/absent local migrations; no changes applied')
    for v in PHASE4:
        matches=list((ROOT/'supabase'/'migrations').glob(v+'*.sql'))
        if len(matches)!=1: raise RuntimeError('Missing or duplicate Phase 4 SQL: '+v)
    subprocess.run([sys.executable,'scripts/phase3/source_baseline_test.py'],cwd=ROOT,check=True)
    print('PHASE 4 PREFLIGHT: PASS; exact Linux local DB, original Git anchor, phase3 migration hashes')
if __name__=='__main__':
    try:run()
    except Exception as exc:
        print('PHASE 4 PREFLIGHT FAIL: '+str(exc),file=sys.stderr);raise SystemExit(1)
