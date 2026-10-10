"""Current approved pure score PREVIEW tests: no authenticated awards occur."""
import copy
import json
import unittest
from collections import Counter
from pathlib import Path

from parser import parse_share
from scoring import (
    PREVIEW_BY_GAME, RULE_VERSION_BY_GAME, WORDLE_PERFORMANCE,
    FOXIMAX_PERFORMANCE, minute_cryptic_preview, foximax_preview,
    polygonle_preview, krillion_preview, preview_score, wordle_preview,
)

FIXTURE_PATH = Path(__file__).with_name('wordlegroup_five_game_anonymized.jsonl')
FIXTURES = [json.loads(line) for line in FIXTURE_PATH.read_text(encoding='utf-8').splitlines()]


def fixture_for(game, predicate=lambda f: True):
    for item in FIXTURES:
        if item['game'] == game:
            parsed = parse_share(item['share_text'])
            if predicate(parsed['fields']):
                return parsed
    raise AssertionError('fixture absent: ' + game)


class ApprovedRuleTests(unittest.TestCase):
    def test_all_five_rules_approved_and_versioned(self):
        self.assertEqual(set(PREVIEW_BY_GAME),
                         {'wordle','minute_cryptic','foximax','polygonle','krillion'})
        self.assertEqual(set(RULE_VERSION_BY_GAME), set(PREVIEW_BY_GAME))
        self.assertEqual(len(set(RULE_VERSION_BY_GAME.values())), 5)
        self.assertTrue(all(v.endswith('v1-approved') for v in RULE_VERSION_BY_GAME.values()))

    def test_all_258_corpus_shares_have_unawarded_approved_preview(self):
        counts = Counter()
        for item in FIXTURES:
            parsed = parse_share(item['share_text'])
            preview = preview_score(parsed)
            counts[item['game']] += 1
            self.assertEqual(preview['rule_version'],RULE_VERSION_BY_GAME[item['game']])
            self.assertTrue(preview['rule_approved'])
            self.assertFalse(preview['provisional_rule'])
            self.assertFalse(preview['result_accepted'])
            self.assertFalse(preview['awarded'])
            self.assertTrue(preview['requires_eligibility_and_authentication'])
            self.assertFalse(parsed['scoring_eligible'])
            self.assertEqual(preview['total_points'],preview['performance_points']+1)
            self.assertTrue(0 <= preview['performance_points'] <= 10)
            if item['game'] in ('foximax','polygonle','krillion'):
                self.assertTrue(preview['requires_review'])
            else:
                self.assertFalse(preview['requires_review'])
        self.assertEqual(counts, {
            'wordle': 116,'minute_cryptic':33,'foximax':70,
            'polygonle':18,'krillion':21,
        })

    def test_wordle_all_success_values(self):
        p=fixture_for('wordle',lambda f: not f['completed_failure'])
        for attempts, perf in WORDLE_PERFORMANCE.items():
            q=copy.deepcopy(p)
            q['fields']['attempts']=attempts
            self.assertEqual(wordle_preview(q)['total_points'],perf+1)

    def test_wordle_failure_zero_plus_participation(self):
        p=fixture_for('wordle',lambda f: f['completed_failure'])
        self.assertEqual(wordle_preview(p)['total_points'],1)

    def test_minute_cryptic_hints_boundary(self):
        p=fixture_for('minute_cryptic')
        for hints, perf in [(0,10),(1,9),(6,4),(10,0),(12,0),(150,0)]:
            q=copy.deepcopy(p)
            q['fields']['hints_used']=hints
            self.assertEqual(minute_cryptic_preview(q)['performance_points'],perf)

    def test_minute_cryptic_par_does_not_double_count(self):
        p=fixture_for('minute_cryptic')
        q=copy.deepcopy(p)
        q['fields']['signed_under_par_difference']=99
        q['fields']['time_display']='12h'
        self.assertEqual(minute_cryptic_preview(p)['total_points'],
                         minute_cryptic_preview(q)['total_points'])

    def test_minute_cryptic_negative_and_boolean_hint_rejected(self):
        for bad in [-1,True,3.5,None]:
            p=fixture_for('minute_cryptic')
            p['fields']['hints_used']=bad
            with self.assertRaises(ValueError):
                minute_cryptic_preview(p)

    def test_foximax_full_1_to_8_map(self):
        p=fixture_for('foximax',lambda f: not f['completed_failure'])
        for n,perf in FOXIMAX_PERFORMANCE.items():
            q=copy.deepcopy(p)
            q['fields']['fraction_numerator']=n
            self.assertEqual(foximax_preview(q)['performance_points'],perf)

    def test_foximax_real_x8_failure(self):
        p=fixture_for('foximax',lambda f: f['completed_failure'])
        self.assertEqual(foximax_preview(p)['total_points'],1)

    def test_foximax_nonoriginal_6_or_7_rejected(self):
        for denominator in (6,7,9,True):
            p=fixture_for('foximax')
            p['fields']['fraction_denominator']=denominator
            with self.assertRaises(ValueError):
                foximax_preview(p)

    def test_foximax_letters_do_not_change_points(self):
        p=fixture_for('foximax')
        q=copy.deepcopy(p)
        q['fields']['letter_count_displayed']=999
        self.assertEqual(foximax_preview(p)['total_points'],foximax_preview(q)['total_points'])

    def test_polygonle_all_attempt_values(self):
        p=fixture_for('polygonle',lambda f: not f['completed_failure'])
        for n,perf in WORDLE_PERFORMANCE.items():
            q=copy.deepcopy(p)
            q['fields']['attempts']=n
            self.assertEqual(polygonle_preview(q)['performance_points'],perf)

    def test_polygonle_real_failure(self):
        p=fixture_for('polygonle',lambda f: f['completed_failure'])
        self.assertEqual(polygonle_preview(p)['total_points'],1)

    def test_polygonle_length_six_seven_eight_supported(self):
        p=fixture_for('polygonle')
        for length in (6,7,8):
            q=copy.deepcopy(p)
            q['fields']['word_length_observed']=length
            self.assertEqual(polygonle_preview(q)['total_points'],polygonle_preview(p)['total_points'])

    def test_polygonle_mini_and_unobserved_rejected(self):
        for length in (5,9,True,None):
            p=fixture_for('polygonle')
            p['fields']['word_length_observed']=length
            with self.assertRaises(ValueError):
                polygonle_preview(p)

    def test_krillion_round_half_up_examples(self):
        p=fixture_for('krillion')
        for score,expected_total in [(0,1),(34,1),(35,2),(60,2),
                                     (185,4),(440,7),(665,11),(700,11)]:
            q=copy.deepcopy(p)
            q['fields']['reported_number']=score
            self.assertEqual(krillion_preview(q)['total_points'],expected_total)

    def test_krillion_range_and_noninteger_guard(self):
        for bad in [-1,701,True,440.1,None,'440']:
            p=fixture_for('krillion')
            p['fields']['reported_number']=bad
            with self.assertRaises(ValueError):
                krillion_preview(p)

    def test_krillion_trail_has_no_score_bonus(self):
        p=fixture_for('krillion')
        q=copy.deepcopy(p)
        q['fields']['symbol_trail_raw']='emoji count should not change score'
        self.assertEqual(krillion_preview(q)['total_points'],krillion_preview(p)['total_points'])

    def test_invalid_and_unrecognized_and_unsupported_cannot_preview(self):
        for text in ('Hello!', 'Wordle 99 5/6', '#Polygonle 99 1/6\n⬢\n🟩',
                     '🦊#FoxiMax #123 2/8 (5 letters)\n🟩🟩',
                     'Krillion #88 🐠\nnot a number\n🐠🐠'):
            with self.assertRaises(ValueError):
                preview_score(parse_share(text))

    def test_unsupported_result_status_guard_even_with_typed_fields(self):
        for game in PREVIEW_BY_GAME:
            p=fixture_for(game)
            p['status']='invalid'
            with self.assertRaises(ValueError):
                preview_score(p)

    def test_contradictory_failure_rejected(self):
        for game,field in [('wordle','attempts'),('foximax','fraction_numerator'),
                           ('polygonle','attempts')]:
            p=fixture_for(game)
            p['fields']['completed_failure']=True
            p['fields'][field]=2
            with self.assertRaises(ValueError):
                preview_score(p)

    def test_wordle_comment_review_has_no_auto_preview(self):
        p=fixture_for('wordle')
        p['status']='needs_review'
        with self.assertRaises(ValueError):
            wordle_preview(p)

    def test_no_0_for_skipped_puzzle_in_preview_api(self):
        with self.assertRaises(ValueError):
            preview_score({'game':'wordle','status':'unrecognized','fields':{}})

    def test_owner_approved_score_separate_from_league_allocation(self):
        p=fixture_for('foximax')
        score=preview_score(p)
        self.assertNotIn('league_id', score)
        self.assertNotIn('account_id', score)
        self.assertFalse(score['awarded'])

if __name__=='__main__':
    unittest.main()
