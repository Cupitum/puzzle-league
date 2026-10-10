"""HISTORICAL INACTIVE pre-approval scoring-policy CANDIDATES only.

This is a preserved pre-approval snapshot; the owner has now approved
corresponding policies, implemented in scoring.py. These produce historical what-if previews for owner
review and NEVER write participant scores, league entries, or award points.
Keep these separate from scoring.py's previously approved/provisional rules.
"""
from __future__ import annotations

FOXIMAX_VERSION = 'foximax-n8-candidate-v0-unapproved'
POLYGONLE_VERSION = 'polygonle-wordle-table-candidate-v0-unapproved'
KRILLION_VERSION = 'krillion-absolute-700-candidate-v0-unapproved'
MINUTE_CRYPTIC_VERSION = 'minute-cryptic-hints-only-candidate-v0-unapproved'

FOXIMAX_PERFORMANCE = {1: 10, 2: 9, 3: 7, 4: 6, 5: 5, 6: 4, 7: 2, 8: 1}
POLYGONLE_PERFORMANCE = {1: 10, 2: 8, 3: 6, 4: 4, 5: 2, 6: 1}


def _check(p, game, statuses):
    if p.get('game') != game or p.get('status') not in statuses:
        raise ValueError('candidate requires typed observed game result; status must match')
    if not isinstance(p.get('fields'), dict):
        raise ValueError('no typed fields')
    return p['fields']


def _candidate(version, performance, caveats):
    assert type(performance) is int and 0 <= performance <= 10
    return {
        'rule_version': version,
        'performance_points_if_approved': performance,
        'participation_points_if_approved': 1,
        'total_points_if_approved': performance + 1,
        'candidate_only': True,
        'approved': False,
        'awarded': False,
        'requires_eligibility_and_review': True,
        'caveats': caveats,
    }


def minute_cryptic_hints_candidate(parsed):
    f = _check(parsed, 'minute_cryptic', {'recognized_valid'})
    hints = f.get('hints_used')
    if type(hints) is not int or hints < 0:
        raise ValueError('invalid hints')
    performance = min(10, max(0, 10 - hints))
    return _candidate(MINUTE_CRYPTIC_VERSION, performance,
                      ['community_par_is_descriptive_not_score_affecting',
                       'share_authenticity_not_verified'])


def fox_candidate(parsed):
    f = _check(parsed, 'foximax', {'needs_review'})
    if f.get('fraction_denominator') != 8:
        raise ValueError('only observed original n/8 FoxiMax variant covered')
    if f.get('completed_failure') is True:
        if f.get('fraction_numerator') is not None:
            raise ValueError('failure has numeric numerator')
        performance = 0
    elif f.get('completed_failure') is False:
        n = f.get('fraction_numerator')
        if type(n) is not int or n not in FOXIMAX_PERFORMANCE:
            raise ValueError('unsupported FoxiMax displayed word count')
        performance = FOXIMAX_PERFORMANCE[n]
    else:
        raise ValueError('unknown completion status')
    return _candidate(FOXIMAX_VERSION, performance,
                      ['only_daily_original_n8_intended',
                       'share_cannot_independently_verify_mode_or_date',
                       'letter_count_is_diagnostic_only'])


def polygonle_candidate(parsed):
    f = _check(parsed, 'polygonle', {'needs_review'})
    if f.get('attempt_limit_displayed') != 6 or f.get('word_length_observed') not in (6, 7, 8):
        raise ValueError('unsupported daily Polygonle attempt count or word length')
    if f.get('completed_failure') is True:
        if f.get('attempts') is not None:
            raise ValueError('failure has attempts')
        performance = 0
    elif f.get('completed_failure') is False:
        n = f.get('attempts')
        if type(n) is not int or n not in POLYGONLE_PERFORMANCE:
            raise ValueError('invalid solve attempts')
        performance = POLYGONLE_PERFORMANCE[n]
    else:
        raise ValueError('unknown completion')
    return _candidate(POLYGONLE_VERSION, performance,
                      ['difficulty_modes_not_distinguished_by_observed_share',
                       'daily_vs_unlimited_not_independently_verifiable',
                       'no_hard_or_expert_bonus',
                       'puzzle_date_is_not_in_observed_share'])


def krillion_candidate(parsed):
    f = _check(parsed, 'krillion', {'needs_review'})
    score = f.get('reported_number')
    if type(score) is not int or not 0 <= score <= 700:
        raise ValueError('Krillion reported score outside candidate daily 0..700')
    # Round to nearest integer, half up, using integer arithmetic.
    # e.g. 0->0; 35->1; 185->3; 440->6; 700->10.
    performance = min(10, (score + 35) // 70)
    return _candidate(KRILLION_VERSION, performance,
                      ['absolute_700_scale_candidate_not_ranked',
                       'trail_symbols_have_unverified_semantics',
                       'only_daily_dive_intended',
                       'share_date_not_independently_verified'])


CANDIDATE_BY_GAME = {
    'minute_cryptic': minute_cryptic_hints_candidate,
    'foximax': fox_candidate,
    'polygonle': polygonle_candidate,
    'krillion': krillion_candidate,
}
