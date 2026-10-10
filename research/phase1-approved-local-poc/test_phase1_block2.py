import unittest
from collections import Counter
from pathlib import Path
from parser import parse_share, parse_transcript
from scoring import minute_cryptic_preview, wordle_preview
from identity import puzzle_identity_candidate, account_puzzle_uniqueness_candidate

BASE = Path(__file__).parent
NEW = parse_transcript((BASE/'new_samples_2026-09-06_to_07_anonymized.txt').read_text(encoding='utf-8'))
OLD = parse_transcript((BASE/'samples.txt').read_text(encoding='utf-8'))


class NewFixtureTests(unittest.TestCase):
    def test_message_count_and_ignored_globle(self):
        self.assertEqual(len(NEW), 8)
        self.assertEqual(Counter(x['parsed']['game'] for x in NEW),
                         Counter({'wordle': 6, 'minute_cryptic': 1, None: 1}))
        self.assertEqual(NEW[-1]['parsed']['status'], 'unrecognized')

    def test_six_wordle_results(self):
        vals = [x['parsed'] for x in NEW if x['parsed']['game'] == 'wordle']
        self.assertEqual([x['fields']['attempts'] for x in vals], [5,5,6,5,4,5])
        self.assertEqual([x['fields']['puzzle_number'] for x in vals], [1905]*3 + [1906]*3)
        self.assertTrue(all(x['status'] == 'recognized_valid' for x in vals))
        self.assertIsNone(vals[0]['fields']['puzzle_date'])

    def test_new_minute_cryptic_emoji_and_par(self):
        x = NEW[3]['parsed']
        self.assertEqual(x['status'], 'recognized_valid')
        self.assertEqual(x['fields']['puzzle_date'], '2026-09-06')
        self.assertEqual(x['fields']['hints_used'], 6)
        self.assertEqual(x['fields']['signed_under_par_difference'], -3)
        self.assertEqual(x['fields']['solver_count_observed'], 180458)
        self.assertEqual(x['fields']['time_display'], '34m 19s')
        self.assertEqual(x['fields']['result_icon'], '🏋️')

    def test_previous_minute_cryptic_regression(self):
        x = next(x['parsed'] for x in OLD if x['parsed']['game'] == 'minute_cryptic')
        self.assertEqual(x['status'], 'recognized_valid')
        self.assertEqual(x['fields']['signed_under_par_difference'], 1)

    def test_foximax_three_typed(self):
        xs = [x['parsed'] for x in OLD if x['parsed']['game'] == 'foximax']
        self.assertEqual([(x['fields']['puzzle_number'], x['fields']['fraction_numerator'], x['fields']['letter_count_displayed']) for x in xs],
                         [(1502,7,19), (1502,8,20), (1505,5,16)])
        self.assertTrue(all(x['status'] == 'needs_review' and not x['scoring_eligible'] for x in xs))

    def test_polygonle_win_loss_variants(self):
        xs = [x['parsed'] for x in OLD if x['parsed']['game'] == 'polygonle']
        self.assertEqual([x['fields']['puzzle_number'] for x in xs], [1529,1529])
        self.assertEqual([x['fields']['completed_failure'] for x in xs], [True, False])
        self.assertEqual([x['fields']['attempts'] for x in xs], [None, 3])
        self.assertEqual(xs[1]['fields']['streak_displayed'], 22)
        self.assertEqual([x['fields']['word_length_observed'] for x in xs], [8,8])
        self.assertTrue(all(x['status'] == 'needs_review' for x in xs))

    def test_krillion_trail_remains_opaque(self):
        xs = [x['parsed'] for x in OLD if x['parsed']['game'] == 'krillion']
        self.assertEqual([x['fields']['reported_number'] for x in xs], [90,440])
        self.assertEqual([x['fields']['puzzle_number'] for x in xs], [84,84])
        self.assertTrue(all('symbols_meaning_unverified' in x['issues'] for x in xs))
        self.assertTrue(all('score' not in x['fields'] for x in xs))

    def test_malformed_extra_games_no_valid_scoring(self):
        invalids = [
            '🦊#FoxiMax #1502 3/8 (19 letters)\n🟩🟩🟩🟩🟩',
            '#Polygonle 1529 1/6\n⬢\n🟩🟩🟩🟩',
            'Krillion #84 🦐\nnot a number\n🫧⬛',
        ]
        self.assertTrue(all(parse_share(x)['status'] in {'invalid', 'ambiguous'} for x in invalids))
        self.assertTrue(all(not parse_share(x)['scoring_eligible'] for x in invalids))

    def test_no_extra_games_auto_award(self):
        self.assertTrue(all(not x['parsed']['scoring_eligible'] for x in OLD+NEW))


class ScorePreviewTests(unittest.TestCase):
    @staticmethod
    def wordle(tries):
        if tries == 'X':
            return parse_share('Wordle 99 X/6\n' + '⬛'*5 + '\n' + ('⬛'*5+'\n')*5)
        n = int(tries)
        return parse_share('Wordle 99 '+tries+'/6\n' + ('⬛'*5+'\n')*(n-1) + '🟩'*5)

    def test_approved_wordle_all_performance_tiers(self):
        expected = {'1':11,'2':9,'3':7,'4':5,'5':3,'6':2,'X':1}
        for attempt, total in expected.items():
            with self.subTest(attempt=attempt):
                score = wordle_preview(self.wordle(attempt))
                self.assertEqual(score['total_points'], total)
                self.assertEqual(score['participation_points'], 1)
                self.assertFalse(score['awarded'])
                self.assertFalse(score['provisional_rule'])

    def test_minute_cryptic_approved_hints_only(self):
        sept = minute_cryptic_preview(NEW[3]['parsed'])
        octr = minute_cryptic_preview(next(x['parsed'] for x in OLD if x['parsed']['game']=='minute_cryptic'))
        self.assertEqual((sept['performance_points'], sept['total_points']), (4,5))
        self.assertEqual((octr['performance_points'], octr['total_points']), (9,10))
        self.assertFalse(sept['provisional_rule'] or octr['provisional_rule'])
        self.assertFalse(sept['awarded'] or octr['awarded'])

    def test_cannot_score_unsupported_game(self):
        p = next(x['parsed'] for x in OLD if x['parsed']['game']=='krillion')
        with self.assertRaises(ValueError):
            wordle_preview(p)
        with self.assertRaises(ValueError):
            minute_cryptic_preview(p)


class IdentityCandidateTests(unittest.TestCase):
    def test_cross_player_same_wordle_puzzle_not_same_account(self):
        results = [x['parsed'] for x in NEW if x['parsed']['game']=='wordle']
        self.assertEqual(puzzle_identity_candidate(results[0]), ('wordle','number:1905'))
        self.assertEqual(puzzle_identity_candidate(results[2]), ('wordle','number:1905'))
        self.assertNotEqual(account_puzzle_uniqueness_candidate('user_1',results[0]),
                            account_puzzle_uniqueness_candidate('user_2',results[2]))
        self.assertEqual(account_puzzle_uniqueness_candidate('user_1',results[0]),
                         account_puzzle_uniqueness_candidate('user_1',results[2]))
        self.assertNotEqual(account_puzzle_uniqueness_candidate('user_1',results[0]),
                            account_puzzle_uniqueness_candidate('user_1',results[3]))

    def test_all_five_puzzle_identity_fields(self):
        by_game = {x['parsed']['game']:x['parsed'] for x in OLD+NEW if x['parsed']['game']}
        expected = {'wordle':'number:1906','minute_cryptic':'date:2026-09-06',
                    'foximax':'number:1505','polygonle':'number:1529','krillion':'number:84'}
        for game,identity in expected.items():
            self.assertEqual(puzzle_identity_candidate(by_game[game]), (game, identity))

    def test_cannot_use_unsupported_or_invalid_identity(self):
        self.assertIsNone(puzzle_identity_candidate(NEW[-1]['parsed']))
        self.assertIsNone(puzzle_identity_candidate(parse_share('Wordle 123 6/6\n⬛⬛⬛⬛⬛')))
        with self.assertRaises(ValueError):
            account_puzzle_uniqueness_candidate('', NEW[0]['parsed'])


if __name__=='__main__':
    unittest.main(verbosity=2)
