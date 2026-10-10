"""Puzzle League Phase 1 research parser. No submissions/points are awarded here.

The parsers validate *observed share formats*. They cannot establish authenticity,
a player's account, puzzle dates that the game doesn't share, or eligibility.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime

VERSION = '0.4.0-poc'
HEADER = re.compile(r'^\[(\d{2}:\d{2}), (\d{2}/\d{2}/\d{4})\] ([^:\n]+): ?(.*)$')
WORDLE = re.compile(r'^Wordle ([\d,]+) ([1-6X])/6\s*$', re.I)
MC = re.compile(r'^Minute Cryptic - (\d{1,2}) ([A-Za-z]+), (\d{4})$')
# The 🏋️ icon is observed in a real user-supplied Sept 6 result; older icon
# samples use 🏆. Capture the *visible metric*, without decoding the emoji strip.
MC_RESULT = re.compile(
    r'^(🏆|🤝|🏋\ufe0f?)\s*(\d+) hints?\s*[–-]\s*'
    r'(?:(\d+) (under|over) the community par|matched the community par)'
    r'\s*\(([\d,]+) solvers so far\)\.?(?:\s*Time:\s*([^\n]+))?\.?$',
    re.I,
)
FOX = re.compile(r'^🦊#FoxiMax\s+#(\d+)\s+(\d+|X)/(\d+)\s+\((\d+) letters\)$', re.I)
POLY = re.compile(r'^#Polygonle\s+([\d,]+)\s+([1-6]|😔)/6[\ufe0e\ufe0f]?$', re.I)
POLY_STREAK = re.compile(r'^🔥\s*streak:\s*(\d+)$', re.I)
KRILLION = re.compile(r'^Krillion\s+#(\d+)\s+(.+)$', re.I)
GRID = {'🟩', '🟨', '⬛', '⬜'}
GRID_PATTERN = re.compile(r'🟩|🟨|⬛|⬜')
FOX_GRID_PATTERN = re.compile(r'🟩|🟥|🟨|⬛|⬜')


def split_messages(text):
    parts = []
    current = None
    for line in text.splitlines():
        m = HEADER.match(line)
        if m:
            if current:
                parts.append(current)
            current = {
                'transport': {'time': m.group(1), 'date': m.group(2), 'sender': m.group(3)},
                'text': m.group(4),
            }
        elif current:
            current['text'] += '\n' + line
    if current:
        parts.append(current)
    if not parts and text.strip():
        parts = [{'transport': None, 'text': text.strip()}]
    return parts


def result(game, status, raw, fields=None, issues=None):
    return {
        'parser_version': VERSION,
        'game': game,
        'status': status,
        'raw_text': raw,
        'fields': fields or {},
        'issues': issues or [],
        # Syntax recognition is not acceptance, identity proof, or permission to award.
        'scoring_eligible': False,
    }


def _grid(line, width, pattern=GRID_PATTERN):
    tiles = pattern.findall(line)
    return tiles if len(tiles) == width and ''.join(tiles) == line else None


def _after_urls(lines):
    return [ln for ln in lines if not ln.startswith(('https://', 'http://'))]


def parse_wordle(lines, raw, m):
    n = int(m.group(1).replace(',', ''))
    tries = m.group(2).upper()
    expected = 6 if tries == 'X' else int(tries)
    payload = _after_urls(lines[1:])
    if len(payload) < expected:
        return result('wordle', 'invalid', raw, issues=['row_count_mismatch'])
    rows = []
    for ln in payload[:expected]:
        tiles = _grid(ln, 5)
        if tiles is None:
            return result('wordle', 'invalid', raw, issues=['unexpected_grid_content'])
        rows.append(tiles)
    if tries != 'X' and rows[-1] != ['🟩'] * 5:
        return result('wordle', 'invalid', raw, issues=['winning_row_missing'])
    if tries == 'X' and ['🟩'] * 5 in rows:
        return result('wordle', 'invalid', raw, issues=['failed_result_contains_win'])
    if n <= 0:
        return result('wordle', 'invalid', raw, issues=['invalid_puzzle_number'])
    fields = {
        'puzzle_number': n, 'attempts': None if tries == 'X' else int(tries),
        'completed_failure': tries == 'X', 'grid': rows, 'puzzle_date': None,
    }
    trailing = payload[expected:]
    if trailing:
        # A real WhatsApp post appended personal commentary after a valid grid.
        # Preserve the input, allow typed extraction, but never auto-accept extras.
        if any(_grid(ln, 5) is not None for ln in trailing):
            return result('wordle', 'invalid', raw, issues=['unexpected_additional_grid_rows'])
        return result('wordle', 'needs_review', raw, fields,
                      ['nonshare_trailing_text_requires_confirmation', 'puzzle_date_not_verified'])
    return result('wordle', 'recognized_valid', raw, fields,
                  ['puzzle_date_not_verified'])


def parse_minute_cryptic(lines, raw, m):
    try:
        month = datetime.strptime(m.group(2), '%B').month
        day = date(int(m.group(3)), month, int(m.group(1)))
    except (ValueError, AttributeError):
        return result('minute_cryptic', 'invalid', raw, issues=['invalid_puzzle_date'])
    if len(lines) < 4 or not re.fullmatch(r'["“].+["”]\s*\([\d, ]+\)', lines[1]):
        return result('minute_cryptic', 'ambiguous', raw, issues=['clue_or_format_not_recognized'])
    matches = [x for x in lines[2:] if MC_RESULT.fullmatch(x)]
    if len(matches) != 1:
        return result('minute_cryptic', 'ambiguous', raw, issues=['community_par_line_not_recognized'])
    match = MC_RESULT.fullmatch(matches[0])
    hints = int(match.group(2))
    under = int(match.group(3)) if match.group(3) else 0
    if match.group(4) == 'over':
        under = -under
    return result('minute_cryptic', 'recognized_valid', raw, {
        'puzzle_date': day.isoformat(), 'clue': lines[1],
        'hints_used': hints, 'signed_under_par_difference': under,
        'solver_count_observed': int(match.group(5).replace(',', '')),
        'time_display': match.group(6).rstrip('.') if match.group(6) else None,
        'puzzle_number': None, 'result_icon': match.group(1),
    }, ['community_par_semantics_unverified', 'hint_taxonomy_unverified'])


def parse_foximax(lines, raw, m):
    number, cap, letters = int(m.group(1)), int(m.group(3)), int(m.group(4))
    numerator = m.group(2).upper()
    failed = numerator == 'X'
    attempts = None if failed else int(numerator)
    if number < 1 or cap < 1 or cap > 30 or letters < 1 or (attempts is not None and not 1 <= attempts <= cap):
        return result('foximax', 'invalid', raw, issues=['invalid_reported_numeric_field'])
    rows = []
    for ln in _after_urls(lines[1:]):
        tiles = _grid(ln, 5, FOX_GRID_PATTERN)
        if tiles is None:
            return result('foximax', 'ambiguous', raw, issues=['unexpected_row_format'])
        rows.append(tiles)
    if len(rows) != (cap if failed else attempts):
        return result('foximax', 'invalid', raw, issues=['row_count_mismatch'])
    return result('foximax', 'needs_review', raw, {
        'puzzle_number': number, 'fraction_numerator': attempts,
        'fraction_denominator': cap, 'completed_failure': failed,
        'letter_count_displayed': letters, 'grid': rows, 'puzzle_date': None,
    }, ['typed_format_only', 'mode_unverified', 'puzzle_date_not_verified'] +
       (['failed_result_reported'] if failed else []))


def parse_polygonle(lines, raw, m):
    number = int(m.group(1).replace(',', ''))
    tries = m.group(2)
    if number < 1:
        return result('polygonle', 'invalid', raw, issues=['invalid_puzzle_number'])
    rest = _after_urls(lines[1:])
    if not rest:
        return result('polygonle', 'ambiguous', raw, issues=['missing_pattern_header'])
    pattern = rest.pop(0)
    streak = None
    rows = []
    word_length = None
    for ln in rest:
        sm = POLY_STREAK.fullmatch(ln)
        if sm and streak is None:
            streak = int(sm.group(1))
            continue
        tiles = GRID_PATTERN.findall(ln)
        if ''.join(tiles) != ln or not 5 <= len(tiles) <= 8:
            return result('polygonle', 'ambiguous', raw, issues=['unsupported_grid_or_trailer'])
        if word_length is None:
            word_length = len(tiles)
        if len(tiles) != word_length:
            return result('polygonle', 'invalid', raw, issues=['inconsistent_word_length'])
        rows.append(tiles)
    failed = tries == '😔'
    if len(rows) != (6 if failed else int(tries)):
        return result('polygonle', 'invalid', raw, issues=['row_count_mismatch'])
    if not failed and rows and rows[-1] != ['🟩'] * word_length:
        return result('polygonle', 'invalid', raw, issues=['winning_row_missing'])
    if failed and rows and ['🟩'] * word_length in rows:
        return result('polygonle', 'invalid', raw, issues=['failed_result_contains_win'])
    return result('polygonle', 'needs_review', raw, {
        'puzzle_number': number, 'attempts': None if failed else int(tries),
        'completed_failure': failed, 'attempt_limit_displayed': 6,
        'pattern_header_raw': pattern, 'word_length_observed': word_length, 'grid': rows,
        'streak_displayed': streak, 'puzzle_date': None,
    }, ['typed_format_only', 'mode_unverified', 'puzzle_date_not_verified'])


def parse_krillion(lines, raw, m):
    number = int(m.group(1))
    others = _after_urls(lines[1:])
    if number < 1:
        return result('krillion', 'invalid', raw, issues=['invalid_puzzle_number'])
    if len(others) != 2 or not re.fullmatch(r'\d+', others[0]) or not others[1]:
        return result('krillion', 'ambiguous', raw, issues=['unsupported_score_or_trail_format'])
    # This numerical value is intentionally NOT labelled points, rank or success.
    # The symbol trail is intentionally opaque until game mechanics are verified.
    return result('krillion', 'needs_review', raw, {
        'puzzle_number': number, 'header_symbol_raw': m.group(2),
        'reported_number': int(others[0]), 'symbol_trail_raw': others[1],
        'puzzle_date': None,
    }, ['typed_format_only', 'mode_unverified', 'symbols_meaning_unverified',
        'puzzle_date_not_verified'])


def parse_share(raw):
    raw = raw.strip()
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if not lines:
        return result(None, 'invalid', raw, issues=['empty_input'])
    head = lines[0]
    match = WORDLE.fullmatch(head)
    if match:
        return parse_wordle(lines, raw, match)
    if head.lower().startswith('wordle '):
        return result('wordle', 'invalid', raw, issues=['wordle_header_not_recognized'])
    match = MC.fullmatch(head)
    if match:
        return parse_minute_cryptic(lines, raw, match)
    if head.lower().startswith('minute cryptic'):
        return result('minute_cryptic', 'ambiguous', raw, issues=['minute_cryptic_header_not_recognized'])
    match = FOX.fullmatch(head)
    if match:
        return parse_foximax(lines, raw, match)
    if head.lower().startswith('🦊#foximax'):
        return result('foximax', 'ambiguous', raw, issues=['foximax_header_not_recognized'])
    match = POLY.fullmatch(head)
    if match:
        return parse_polygonle(lines, raw, match)
    if head.lower().startswith('#polygonle'):
        return result('polygonle', 'ambiguous', raw, issues=['polygonle_header_not_recognized'])
    match = KRILLION.fullmatch(head)
    if match:
        return parse_krillion(lines, raw, match)
    if head.lower().startswith('krillion'):
        return result('krillion', 'ambiguous', raw, issues=['krillion_header_not_recognized'])
    return result(None, 'unrecognized', raw, issues=['unsupported_or_non_game_message'])


def parse_transcript(text):
    return [{'transport': m['transport'], 'parsed': parse_share(m['text'])} for m in split_messages(text)]


if __name__ == '__main__':
    print(json.dumps(parse_transcript(sys.stdin.read()), ensure_ascii=False, indent=2))
