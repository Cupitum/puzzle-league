#!/usr/bin/env python3
"""Non-destructive preflight, strict expected version and Docker local target."""
from __future__ import annotations
import re
import subprocess
import sys
from local_db import ROOT, psql, run, verify_local

BASE='1e9f216577b116d05d2cda924ba3651b5efbc820'
PRIOR=('20261012170000','20261013220000','20261013220100','20261013220200')
NEW='20261014150000'

def main():
    verify_local()
    state=run(['git','status','--porcelain']).strip()
    # Phase 3 new files may be unstaged. Existing edits beyond package are
    # allowed only if explicitly reviewed before run; never reset them.
    head=run(['git','rev-parse','HEAD']).strip()
    if head!=BASE:
        raise RuntimeError(f'Expected source HEAD {BASE[:7]}; found {head[:7]}. Stop and reconcile.')
    installed=psql('select version from supabase_migrations.schema_migrations order by version;').splitlines()
    if any(p not in installed for p in PRIOR):
        raise RuntimeError('Four baseline migrations are not all registered locally')
    unknown = set(installed)-set(PRIOR)-{NEW}
    if unknown:
        raise RuntimeError('Unexpected existing local migrations: stop for schema review')
    print('PASS: original Git commit, exact local DB container, four baseline migrations')
    print('NOTICE: review git status separately; no reset/overwrite will be used')

if __name__=='__main__':
    try: main()
    except Exception as e:
        print(f'PRE-FLIGHT FAIL: {e}',file=sys.stderr)
        sys.exit(1)
