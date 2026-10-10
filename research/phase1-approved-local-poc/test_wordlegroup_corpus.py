"""Anonymous regression tests derived from the private group export.

Fixture records are NOT verified authentic and NOT app accounts/awarded scores.
"""
import json
import unittest
from collections import Counter, defaultdict
from pathlib import Path

from parser import VERSION, parse_share
from scoring import wordle_preview
from identity import puzzle_identity_candidate

BASE = Path(__file__).parent
FIXTURES = [json.loads(line) for line in (BASE / 'wordlegroup_five_game_anonymized.jsonl').read_text(encoding='utf-8').splitlines()]
REPORT = json.loads((BASE / 'wordlegroup_ingestion_report.json').read_text(encoding='utf-8'))
PARSED = [(fixture, parse_share(fixture['share_text'])) for fixture in FIXTURES]

class WhatsAppCorpusTests(unittest.TestCase):
    def test_export_has_single_undoubled_432_message_source(self):
        self.assertEqual(REPORT['message_records'], 432)
        self.assertEqual(REPORT['approved_game_records'], 258)
        self.assertEqual(REPORT['other_messages_excluded'], 174)
        self.assertEqual(REPORT['export_used'], 'chat.txt')
        self.assertEqual(len(FIXTURES), 258)
        self.assertEqual(len({f['fixture_id'] for f in FIXTURES}), 258)

    def test_all_five_games_counts(self):
        self.assertEqual(Counter(f['game'] for f in FIXTURES), {
            'wordle':116, 'minute_cryptic':33, 'foximax':70,
            'polygonle':18, 'krillion':21,
        })
        self.assertEqual(set(REPORT['game_counts']),
                         {'wordle','minute_cryptic','foximax','polygonle','krillion'})

    def test_258_puzzle_shares_parse_safely(self):
        for fixture, parsed in PARSED:
            with self.subTest(fixture=fixture['fixture_id']):
                self.assertEqual(parsed['game'], fixture['game'])
                self.assertIn(parsed['status'], ('recognized_valid','needs_review'))
                self.assertEqual(parsed['parser_version'], VERSION)
                self.assertFalse(parsed['scoring_eligible'])

    def test_real_wordle_failures_four(self):
        vals = [p for f,p in PARSED if f['game']=='wordle']
        self.assertEqual(len([p for p in vals if p['fields']['completed_failure']]),4)
        self.assertTrue(all(len(p['fields']['grid'])==6 for p in vals if p['fields']['completed_failure']))
        for p in vals:
            preview=wordle_preview(p)
            self.assertFalse(preview['awarded'])
            self.assertEqual(preview['total_points'], 1 if p['fields']['completed_failure'] else
                {1:11,2:9,3:7,4:5,5:3,6:2}[p['fields']['attempts']])

    def test_real_foximax_x8_failure_and_red_tiles(self):
        vals = [p for f,p in PARSED if f['game']=='foximax']
        losses = [p for p in vals if p['fields']['completed_failure']]
        self.assertEqual(len(losses),4)
        self.assertTrue(all(p['fields']['fraction_numerator'] is None for p in losses))
        self.assertTrue(all(len(p['fields']['grid'])==8 for p in losses))
        self.assertTrue(all(any('🟥' in row for row in p['fields']['grid']) for p in losses))
        self.assertTrue(all(p['status']=='needs_review' for p in vals))

    def test_polygonle_failure_is_one(self):
        vals = [p for f,p in PARSED if f['game']=='polygonle']
        self.assertEqual(sum(bool(p['fields']['completed_failure']) for p in vals),1)
        self.assertTrue(all(p['status']=='needs_review' for p in vals))

    def test_minute_cryptic_wide_hint_range(self):
        vals = [p for f,p in PARSED if f['game']=='minute_cryptic']
        self.assertEqual(len(vals),33)
        self.assertEqual(min(p['fields']['hints_used'] for p in vals),0)
        self.assertEqual(max(p['fields']['hints_used'] for p in vals),12)
        self.assertTrue(all(p['status']=='recognized_valid' for p in vals))

    def test_distinct_puzzles_and_transport_sender_are_not_app_accounts(self):
        ids=defaultdict(set)
        seen=Counter()
        for fixture, p in PARSED:
            candidate=puzzle_identity_candidate(p)
            self.assertIsNotNone(candidate)
            ids[p['game']].add(candidate)
            seen[(fixture['player_pseudonym'], *candidate)] += 1
        self.assertEqual({game:len(vals) for game,vals in ids.items()}, {
            'wordle':45, 'minute_cryptic':28, 'foximax':40, 'polygonle':11, 'krillion':13,
        })
        self.assertEqual(max(seen.values()),1)
        self.assertFalse(REPORT['server_duplicate_enforcement_tested'])

    def test_trailing_chat_comment_is_review_not_invalid(self):
        raw='Wordle 1903 2/6\n⬜⬜⬜⬜⬜\n🟩🟩🟩🟩🟩\nA chat comment, not part of the share.'
        parsed=parse_share(raw)
        self.assertEqual(parsed['status'],'needs_review')
        self.assertEqual(parsed['fields']['attempts'],2)
        self.assertIn('nonshare_trailing_text_requires_confirmation',parsed['issues'])
        self.assertFalse(parsed['scoring_eligible'])
        self.assertEqual(REPORT['nonshare_wordle_comments_removed_from_public_fixtures'],1)
        self.assertEqual(sum(f['source_message_had_extra_chat_comment'] for f in FIXTURES),1)

    def test_malformed_extra_grid_and_foximax_loss(self):
        extra='Wordle 100 1/6\n🟩🟩🟩🟩🟩\n⬛⬛⬛⬛⬛'
        self.assertEqual(parse_share(extra)['status'],'invalid')
        malformed='🦊#FoxiMax #100 X/8 (16 letters)\n'+'\n'.join(['🟥'*5]*7)
        self.assertEqual(parse_share(malformed)['status'],'invalid')

    def test_fixtures_contain_only_pseudonyms_no_chat_messages(self):
        self.assertEqual(set(f['player_pseudonym'] for f in FIXTURES),
                         {'P01','P02','P03','P04','P05'})
        self.assertTrue(all(f['share_text'] for f in FIXTURES))
        self.assertTrue(all(f['transport_date_not_puzzle_date'] is not None for f in FIXTURES))
        self.assertEqual(REPORT['points_awarded'],0)
        self.assertFalse(REPORT['source_authenticity_verified'])

if __name__=='__main__':
    unittest.main(verbosity=2)
