"""Stateless research-only identity candidates. No user authentication or dedupe writes."""
from __future__ import annotations

NUMBERED_GAMES = {'wordle', 'foximax', 'polygonle', 'krillion'}


def puzzle_identity_candidate(parsed):
    """Candidate (game, opaque published ID). Never infer missing dates."""
    if parsed.get('status') not in {'recognized_valid', 'needs_review'}:
        return None
    game = parsed.get('game')
    fields = parsed.get('fields') or {}
    if game in NUMBERED_GAMES:
        number = fields.get('puzzle_number')
        if type(number) is int and number > 0:
            return (game, f'number:{number}')
    if game == 'minute_cryptic':
        day = fields.get('puzzle_date')
        if isinstance(day, str) and day:
            return (game, f'date:{day}')
    return None


def account_puzzle_uniqueness_candidate(account_id, parsed):
    """Only use an actual account ID supplied by a *future authenticated server*.

    WhatsApp sender labels are never login identities. This function doesn't check
    against any storage; returned tuples only demonstrate intended uniqueness.
    """
    if not isinstance(account_id, str) or not account_id.strip():
        raise ValueError('authenticated account ID needed')
    identity = puzzle_identity_candidate(parsed)
    return (account_id, *identity) if identity else None
