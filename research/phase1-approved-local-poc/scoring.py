"""Approved, versioned Puzzle League Phase 1 scoring *previews* (2026-10-10).

Scoring policy is approved. A parsed share is NOT authenticated, accepted,
eligible for a league, or awarded points by this pure research module.
Database uniqueness, moderated acceptance, timed eligibility and season policy
snapshots must be implemented later on the trusted backend.
"""
from __future__ import annotations

WORDLE_RULE_VERSION = 'wordle-fixed-v1-approved'
MINUTE_CRYPTIC_RULE_VERSION = 'minute-cryptic-hints-v1-approved'
FOXIMAX_RULE_VERSION = 'foximax-original-n8-v1-approved'
POLYGONLE_RULE_VERSION = 'polygonle-standard-v1-approved'
KRILLION_RULE_VERSION = 'krillion-daily-absolute700-v1-approved'

WORDLE_PERFORMANCE = {1: 10, 2: 8, 3: 6, 4: 4, 5: 2, 6: 1}
FOXIMAX_PERFORMANCE = {1: 10, 2: 9, 3: 7, 4: 6, 5: 5, 6: 4, 7: 2, 8: 1}
POLYGONLE_PERFORMANCE = WORDLE_PERFORMANCE.copy()
RULE_VERSION_BY_GAME = {
    'wordle': WORDLE_RULE_VERSION,
    'minute_cryptic': MINUTE_CRYPTIC_RULE_VERSION,
    'foximax': FOXIMAX_RULE_VERSION,
    'polygonle': POLYGONLE_RULE_VERSION,
    'krillion': KRILLION_RULE_VERSION,
}


def _fields(parsed, game, *, valid_statuses):
    if not isinstance(parsed, dict) or parsed.get('game') != game:
        raise ValueError('incorrect game for rule')
    if parsed.get('status') not in valid_statuses:
        raise ValueError('unsupported/invalid parser status')
    f = parsed.get('fields')
    if not isinstance(f, dict):
        raise ValueError('typed result fields required')
    return f


def _performance_for_result(fields, mapping, value_field):
    failed = fields.get('completed_failure')
    val = fields.get(value_field)
    if failed is True:
        if val is not None:
            raise ValueError('contradictory failure and successful attempt count')
        return 0
    if failed is not False or type(val) is not int or val not in mapping:
        raise ValueError('invalid completed-result value')
    return mapping[val]


def _preview(rule_version, performance, parsed, *, notes=()):
    if type(performance) is not int or not 0 <= performance <= 10:
        raise ValueError('invalid performance points')
    return {
        'rule_version': rule_version,
        'rule_approved': True,
        'performance_points': performance,
        'participation_points': 1,
        'total_points': performance + 1,
        'provisional_rule': False,
        'result_status': parsed['status'],
        'requires_review': parsed['status'] == 'needs_review',
        'requires_eligibility_and_authentication': True,
        'result_accepted': False,
        'awarded': False,
        'notes': list(notes),
    }


def wordle_preview(parsed):
    f = _fields(parsed, 'wordle', valid_statuses={'recognized_valid'})
    perf = _performance_for_result(f, WORDLE_PERFORMANCE, 'attempts')
    return _preview(WORDLE_RULE_VERSION, perf, parsed, notes=('puzzle_date_not_verified',))


def minute_cryptic_preview(parsed):
    f = _fields(parsed, 'minute_cryptic', valid_statuses={'recognized_valid'})
    hints = f.get('hints_used')
    if type(hints) is not int or hints < 0:
        raise ValueError('invalid hint count')
    # Community par and solve time are statistics, not championship inputs.
    perf = max(0, 10 - hints)
    return _preview(MINUTE_CRYPTIC_RULE_VERSION, perf, parsed,
                    notes=('par_informational_only', 'hint_taxonomy_unverified'))


def foximax_preview(parsed):
    f = _fields(parsed, 'foximax', valid_statuses={'needs_review'})
    if type(f.get('fraction_denominator')) is not int or f['fraction_denominator'] != 8:
        raise ValueError('only original daily /8 format approved')
    perf = _performance_for_result(f, FOXIMAX_PERFORMANCE, 'fraction_numerator')
    return _preview(FOXIMAX_RULE_VERSION, perf, parsed,
                    notes=('mode_and_puzzle_date_require_verification', 'letter_count_informational_only'))


def polygonle_preview(parsed):
    f = _fields(parsed, 'polygonle', valid_statuses={'needs_review'})
    if type(f.get('attempt_limit_displayed')) is not int or f['attempt_limit_displayed'] != 6:
        raise ValueError('only six-attempt Polygonle covered')
    if type(f.get('word_length_observed')) is not int or f['word_length_observed'] not in (6, 7, 8):
        raise ValueError('only regular daily six-to-eight-letter puzzles approved')
    perf = _performance_for_result(f, POLYGONLE_PERFORMANCE, 'attempts')
    return _preview(POLYGONLE_RULE_VERSION, perf, parsed,
                    notes=('daily_vs_other_modes_not_proven_by_share', 'no_difficulty_bonus'))


def krillion_preview(parsed):
    f = _fields(parsed, 'krillion', valid_statuses={'needs_review'})
    score = f.get('reported_number')
    if type(score) is not int or not 0 <= score <= 700:
        raise ValueError('daily Krillion score must be integer 0..700')
    # Round(score / 70) to integer with ties rounded upward, without floats.
    perf = min(10, (score + 35) // 70)
    return _preview(KRILLION_RULE_VERSION, perf, parsed,
                    notes=('daily_mode_and_date_require_verification', 'symbol_trail_informational_only'))


PREVIEW_BY_GAME = {
    'wordle': wordle_preview,
    'minute_cryptic': minute_cryptic_preview,
    'foximax': foximax_preview,
    'polygonle': polygonle_preview,
    'krillion': krillion_preview,
}


def preview_score(parsed):
    """Use only for an unawarded score preview of supported observed formats."""
    if not isinstance(parsed, dict):
        raise ValueError('typed parsed result required')
    game = parsed.get('game')
    if game not in PREVIEW_BY_GAME:
        raise ValueError('no approved scoring rule for game')
    return PREVIEW_BY_GAME[game](parsed)
