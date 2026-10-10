"""Unit tests for unapproved candidate-only scoring; NEVER award points."""
import copy
import json
import unittest
from pathlib import Path

from parser import parse_share
from scoring_candidates import (
    CANDIDATE_BY_GAME, FOXIMAX_PERFORMANCE, POLYGONLE_PERFORMANCE,
    minute_cryptic_hints_candidate, fox_candidate,
    polygonle_candidate, krillion_candidate,
)

PATH = Path(__file__).with_name('wordlegroup_five_game_anonymized.jsonl')


def example(game, predicate=lambda fields: True):
    for line in PATH.read_text(encoding='utf-8').splitlines():
        item = json.loads(line)
        if item['game'] == game:
            parsed = parse_share(item['share_text'])
            if predicate(parsed['fields']):
                return parsed
    raise AssertionError(f'no example for {game}')


class CandidateScoringTests(unittest.TestCase):
    def test_all_candidates_research_corpus(self):
        counts = {k: 0 for k in CANDIDATE_BY_GAME}
        for line in PATH.read_text(encoding='utf-8').splitlines():
            item = json.loads(line)
            if item['game'] in CANDIDATE_BY_GAME:
                out = CANDIDATE_BY_GAME[item['game']](parse_share(item['share_text']))
                self.assertFalse(out['approved'])
                self.assertFalse(out['awarded'])
                self.assertTrue(out['candidate_only'])
                self.assertEqual(out['total_points_if_approved'],
                                 out['performance_points_if_approved'] + 1)
                self.assertTrue(0 <= out['performance_points_if_approved'] <= 10)
                counts[item['game']] += 1
        self.assertEqual(counts, {'minute_cryptic': 33, 'foximax': 70,
                                  'polygonle': 18, 'krillion': 21})

    def test_mc_0_hints(self):
        p = example('minute_cryptic')
        p['fields']['hints_used'] = 0
        self.assertEqual(minute_cryptic_hints_candidate(p)['performance_points_if_approved'], 10)

    def test_mc_12_hints(self):
        p = example('minute_cryptic')
        p['fields']['hints_used'] = 12
        self.assertEqual(minute_cryptic_hints_candidate(p)['performance_points_if_approved'], 0)

    def test_mc_par_difference_does_not_change_candidate_points(self):
        p = example('minute_cryptic')
        p2 = copy.deepcopy(p)
        p2['fields']['signed_under_par_difference'] += 8
        self.assertEqual(minute_cryptic_hints_candidate(p)['total_points_if_approved'],
                         minute_cryptic_hints_candidate(p2)['total_points_if_approved'])

    def test_mc_rejects_wrong_game(self):
        with self.assertRaises(ValueError):
            minute_cryptic_hints_candidate(example('wordle'))

    def test_fox_all_n_1_to_8(self):
        p = example('foximax', lambda f: not f['completed_failure'])
        for n, expected in FOXIMAX_PERFORMANCE.items():
            q = copy.deepcopy(p)
            q['fields']['fraction_numerator'] = n
            self.assertEqual(fox_candidate(q)['performance_points_if_approved'], expected)

    def test_fox_real_loss(self):
        p = example('foximax', lambda f: f['completed_failure'])
        self.assertEqual(fox_candidate(p)['total_points_if_approved'], 1)

    def test_fox_rejects_unobserved_six_word_variant(self):
        p = example('foximax')
        p['fields']['fraction_denominator'] = 6
        with self.assertRaises(ValueError):
            fox_candidate(p)

    def test_poly_wordle_equivalent_table(self):
        p = example('polygonle', lambda f: not f['completed_failure'])
        for n, expected in POLYGONLE_PERFORMANCE.items():
            q = copy.deepcopy(p)
            q['fields']['attempts'] = n
            self.assertEqual(polygonle_candidate(q)['performance_points_if_approved'], expected)

    def test_poly_real_loss(self):
        p = example('polygonle', lambda f: f['completed_failure'])
        self.assertEqual(polygonle_candidate(p)['total_points_if_approved'], 1)

    def test_poly_unsupported_mini_length(self):
        p = example('polygonle')
        p['fields']['word_length_observed'] = 5
        with self.assertRaises(ValueError):
            polygonle_candidate(p)

    def test_krillion_boundaries(self):
        p = example('krillion')
        for raw, expected in [(0,0),(34,0),(35,1),(60,1),(185,3),
                              (440,6),(665,10),(700,10)]:
            q = copy.deepcopy(p)
            q['fields']['reported_number'] = raw
            self.assertEqual(krillion_candidate(q)['performance_points_if_approved'], expected)

    def test_krillion_reject_above_max(self):
        p = example('krillion')
        p['fields']['reported_number'] = 701
        with self.assertRaises(ValueError):
            krillion_candidate(p)

    def test_krillion_reject_negative(self):
        p = example('krillion')
        p['fields']['reported_number'] = -1
        with self.assertRaises(ValueError):
            krillion_candidate(p)

    def test_candidate_rejects_invalid_or_unrecognized_status(self):
        p = example('foximax')
        p['status'] = 'invalid'
        with self.assertRaises(ValueError):
            fox_candidate(p)

if __name__ == '__main__':
    unittest.main()
