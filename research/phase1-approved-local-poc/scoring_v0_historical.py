"""Versioned score *previews* for Phase 1 POC; never award a league score.

This module is intentionally isolated from account / league / season persistence.
"""
from __future__ import annotations

WORDLE_RULE_VERSION = 'wordle-fixed-v1-approved'
MINUTE_CRYPTIC_RULE_VERSION = 'minute-cryptic-formula-v0-provisional'
WORDLE_PERFORMANCE = {1: 10, 2: 8, 3: 6, 4: 4, 5: 2, 6: 1}


def _verified_syntax(p, game):
    if p.get('game') != game or p.get('status') != 'recognized_valid':
        raise ValueError('score preview requires a structurally valid parsed result')


def _preview(rule, perf, provisional):
    return {
        'rule_version': rule,
        'performance_points': perf,
        'participation_points': 1,
        'total_points': perf + 1,
        'provisional_rule': provisional,
        'awarded': False,
    }


def wordle_preview(parsed):
    _verified_syntax(parsed, 'wordle')
    f = parsed['fields']
    attempts = f['attempts']
    if f['completed_failure']:
        if attempts is not None:
            raise ValueError('contradictory Wordle failure')
        perf = 0
    else:
        if attempts not in WORDLE_PERFORMANCE:
            raise ValueError('unsupported Wordle attempts')
        perf = WORDLE_PERFORMANCE[attempts]
    return _preview(WORDLE_RULE_VERSION, perf, provisional=False)


def minute_cryptic_preview(parsed):
    _verified_syntax(parsed, 'minute_cryptic')
    f = parsed['fields']
    hints = f['hints_used']
    difference = f['signed_under_par_difference']
    if not isinstance(hints, int) or hints < 0 or not isinstance(difference, int):
        raise ValueError('invalid provisional minute cryptic inputs')
    perf = max(0, min(10, 10 - hints + difference))
    return _preview(MINUTE_CRYPTIC_RULE_VERSION, perf, provisional=True)
