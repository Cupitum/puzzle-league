#!/usr/bin/env python3
"""Privacy-safe diagnostic for the existing Phase 4 real-JWT HTTP acceptance suite.

Does not change assertions, test data, SQL schema or the acceptance suite itself.
Reports only action labels, numeric HTTP statuses and curated generic Edge errors.
The original test owns its scoped fixture cleanup.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEST = ROOT / 'supabase' / 'tests' / 'phase4_http_acceptance.py'

# Only these generic errors are emitted by the first-party Edge handler.
PUBLIC_ERRORS = frozenset({
    'Authentication required', 'Invalid session', 'Backend not configured',
    'Competition request rejected', 'Competition service unavailable',
    'Permission denied', 'Duplicate or conflict', 'Invalid action',
    'Unknown action', 'Invalid JSON', 'Request too large',
    'Method not allowed', 'Invalid submission method',
    'Share text required (max 16 KB)',
})


def main() -> int:
    spec = importlib.util.spec_from_file_location('phase4_original_http_acceptance', TEST)
    if spec is None or spec.loader is None:
        print('PHASE 4 HTTP DIAGNOSTIC: test source unavailable', file=sys.stderr)
        return 1
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    original_api = mod.api
    last = {'stage': 'before HTTP', 'status': 'none', 'edge_error': 'none'}

    def tracked_api(base, apikey, path, method='GET', payload=None, token=None):
        if path.startswith('/auth/v1/signup'):
            stage = 'auth/signup'
        elif path.startswith('/auth/v1/token'):
            stage = 'auth/login'
        elif path.startswith('/rest/v1/league_score_entries'):
            stage = 'direct-score-write-denial'
        elif path.startswith('/functions/v1/competition'):
            action = payload.get('action', '<missing>') if isinstance(payload, dict) else '<missing>'
            # Fixed approved action names or a generic label, never arbitrary share text.
            known = {'my_history', 'create_league', 'join', 'invite', 'start_season',
                     'standings', 'submit'}
            stage = 'edge/' + (action if action in known else 'other')
        else:
            stage = 'other-request'
        last.update(stage=stage, status='pending', edge_error='none')
        result = original_api(base, apikey, path, method, payload, token)
        last['status'] = result[0]
        body = result[1]
        if isinstance(body, dict) and body.get('error') in PUBLIC_ERRORS:
            last['edge_error'] = body['error']
        return result

    def tracked_must(condition, message):
        if not condition:
            # Existing suite passes hard-coded, non-sensitive assertion descriptions.
            raise AssertionError(message)

    mod.api = tracked_api
    mod.must = tracked_must
    try:
        mod.run()
    except AssertionError as exc:
        # Only static messages from the existing suite. No raw request or response bodies.
        safe_message = str(exc)
        if safe_message not in {
            'Local API required', 'Local publishable key unavailable', 'Auth signup failed',
            'Login failed', 'Unauthenticated request should be denied',
            'League creation failed', 'Outsider entered private league without invite',
            'Invitation issue failed', 'Invite join failed', 'One-use invite reused',
            'First season failed', 'Direct score write was permitted',
            'Private standings leaked to outsider', 'Signed-in submission failed',
            'Verified, eligible synthetic fixture not awarded',
            'Repeat share was not idempotent', 'Combined standings inaccurate',
            'Per-game standings inaccurate', 'Public/login identifier leaked'
        }:
            safe_message = 'Other assertion (message suppressed)'
        print('PHASE 4 HTTP DIAGNOSTIC: FAIL', file=sys.stderr)
        print('  step: ' + str(last['stage']), file=sys.stderr)
        print('  http_status: ' + str(last['status']), file=sys.stderr)
        print('  edge_category: ' + str(last['edge_error']), file=sys.stderr)
        print('  assertion: ' + safe_message, file=sys.stderr)
        return 1
    except Exception as exc:
        # Do NOT print exception content: connection errors can contain URLs or context.
        print('PHASE 4 HTTP DIAGNOSTIC: FAIL', file=sys.stderr)
        print('  step: ' + str(last['stage']), file=sys.stderr)
        print('  http_status: ' + str(last['status']), file=sys.stderr)
        print('  edge_category: ' + str(last['edge_error']), file=sys.stderr)
        print('  exception_type: ' + type(exc).__name__, file=sys.stderr)
        return 1
    print('PHASE 4 HTTP DIAGNOSTIC: PASS (HTTP subset only; full gate still required)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
