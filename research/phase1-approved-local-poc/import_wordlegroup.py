"""Convert a private WhatsApp text export into *anonymized puzzle-only* POC fixtures.

Usage: python import_wordlegroup.py /path/to/WordleGroup.zip
Does not extract a ZIP to disk, export private chat, or score submissions.
A WhatsApp display name is not an authenticated Puzzle League account.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from zipfile import ZipFile

from parser import parse_share
from identity import puzzle_identity_candidate

HEADER = re.compile(
    r'^\[(\d{1,2}/\d{1,2}/\d{2,4}), (\d{1,2}:\d{2}:\d{2} [AP]M)\] (.*)$'
)
ALLOWED = {'wordle', 'minute_cryptic', 'foximax', 'polygonle', 'krillion'}


def read_messages(text):
    msgs = []
    for line in text.splitlines():
        h = HEADER.match(line)
        if h:
            body = h.group(3)
            # WhatsApp export system messages have no `sender: text` separator.
            sender, delim, content = body.partition(': ')
            try:
                sent_at = datetime.strptime(h.group(1) + ' ' + h.group(2), '%m/%d/%y %I:%M:%S %p')
            except ValueError:
                sent_at = None
            msgs.append({'sender': sender if delim else None,
                         'text': content if delim else body,
                         'transport_date': sent_at.date().isoformat() if sent_at else None})
        elif msgs:
            msgs[-1]['text'] += '\n' + line
    return msgs


def private_export_to_fixtures(zip_path):
    with ZipFile(zip_path) as archive:
        if 'chat.txt' not in archive.namelist():
            raise ValueError('Missing source chat.txt')
        if archive.getinfo('chat.txt').file_size > 5_000_000:
            raise ValueError('Unusually large export; inspect before importing')
        source = archive.read('chat.txt').decode('utf-8-sig')
    messages = read_messages(source)
    pseudonyms = {}
    exported = []
    raw_status = defaultdict(Counter)
    game_counts = Counter()
    puzzle_keys = defaultdict(set)
    same_sender_puzzle = Counter()
    extra_comments_removed = 0

    for ordinal, msg in enumerate(messages, start=1):
        raw = msg['text'].strip()
        parsed = parse_share(raw)
        game = parsed['game']
        if game not in ALLOWED:
            continue
        if msg['sender'] not in pseudonyms:
            pseudonyms[msg['sender']] = f'P{len(pseudonyms)+1:02d}'
        player = pseudonyms[msg['sender']]
        game_counts[game] += 1
        raw_status[game][parsed['status']] += 1
        ident = puzzle_identity_candidate(parsed)
        if ident is not None:
            puzzle_keys[game].add(ident)
            same_sender_puzzle[(player,) + ident] += 1

        # Keep authentic puzzle headers, grids and clue text. Drop all non-share
        # commentary (including the observed Wordle #1903 suffix).
        # The full source remains solely in the private user-provided ZIP.
        sanitized = raw
        removed = False
        if game == 'wordle' and 'nonshare_trailing_text_requires_confirmation' in parsed['issues']:
            n = 6 if parsed['fields']['completed_failure'] else parsed['fields']['attempts']
            nonblank = [ln for ln in raw.splitlines() if ln.strip()]
            sanitized = '\n'.join(nonblank[:n+1])
            removed = True
            extra_comments_removed += 1

        exported.append({
            'fixture_id': f'WG-{ordinal:04d}',
            'player_pseudonym': player,
            'transport_date_not_puzzle_date': msg['transport_date'],
            'game': game,
            'share_text': sanitized,
            'source_message_had_extra_chat_comment': removed,
            'original_parse_status': parsed['status'],
        })

    report = {
        'source_archive': 'WordleGroup.zip',
        'export_used': 'chat.txt',
        'alternate_representation_not_counted': 'chat.md',
        'message_records': len(messages),
        'approved_game_records': sum(game_counts.values()),
        'other_messages_excluded': len(messages) - sum(game_counts.values()),
        'game_counts': dict(sorted(game_counts.items())),
        'original_status_counts': {k: dict(v) for k,v in sorted(raw_status.items())},
        'distinct_candidate_puzzles': {k: len(v) for k,v in sorted(puzzle_keys.items())},
        'repeat_transport_sender_game_puzzle_candidates': sum(v-1 for v in same_sender_puzzle.values() if v>1),
        'pseudonymous_transport_senders': len(pseudonyms),
        'nonshare_wordle_comments_removed_from_public_fixtures': extra_comments_removed,
        'source_authenticity_verified': False,
        'server_duplicate_enforcement_tested': False,
        'points_awarded': 0,
    }
    return exported, report


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python import_wordlegroup.py /path/to/WordleGroup.zip')
    out = Path(__file__).parent
    fixtures, report = private_export_to_fixtures(sys.argv[1])
    (out/'wordlegroup_five_game_anonymized.jsonl').write_text(
        ''.join(json.dumps(item, ensure_ascii=False) + '\n' for item in fixtures), encoding='utf-8')
    (out/'wordlegroup_ingestion_report.json').write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
