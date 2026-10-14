#!/usr/bin/env python3
"""Offline phase-3 artifact invariants, no Postgres/CI prerequisites."""
import hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
MIG=(ROOT/'supabase/migrations/20261014150000_phase3_security_audit_infrastructure.sql').read_text()
for name in ['approval_requests','approval_decisions','result_audit_events',
             'prevent_audit_history_mutation','record_security_event','submissions_audit',
             'memberships_role_audit','moderator_delegations_audit',
             'approval_requests_no_delete']:
    assert name in MIG,name
for bad in ['grant all on table','drop table public.','truncate public.']:
    assert bad not in MIG.lower(),bad
assert 'raw_share_text' not in MIG[MIG.index('create function app_private.record_security_event()'):MIG.index('create trigger submissions_audit')].lower(), 'raw share could leak to audit'
assert 'grant execute on function app_private.record_security_event' not in MIG.lower()
assert (ROOT/'supabase/tests/phase3_real_jwt_http_security.py').is_file()
assert (ROOT/'scripts/phase3/verify.sh').is_file()
print('PASS: Phase 3 package security/static invariants')
