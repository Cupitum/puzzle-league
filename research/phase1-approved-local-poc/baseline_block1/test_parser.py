import unittest
from pathlib import Path
from parser import parse_transcript, parse_share
FIXTURE=Path(__file__).with_name('samples.txt').read_text(encoding='utf-8')
class ParsingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.records=parse_transcript(FIXTURE)
    def test_message_split(self): self.assertEqual(len(self.records),12)
    def test_real_wordle(self):
        w=[r['parsed'] for r in self.records if r['parsed']['game']=='wordle']
        self.assertEqual([r['fields']['attempts'] for r in w],[5,4]); self.assertTrue(all(r['status']=='recognized_valid' and r['fields']['puzzle_number']==1936 for r in w))
    def test_minute_cryptic(self):
        r=[x['parsed'] for x in self.records if x['parsed']['game']=='minute_cryptic'][0]
        self.assertEqual(r['status'],'recognized_valid'); self.assertEqual((r['fields']['hints_used'],r['fields']['signed_under_par_difference'],r['fields']['puzzle_date']),(1,1,'2026-10-07'))
    def test_catalogue_games_review(self):
        p=[x['parsed'] for x in self.records if x['parsed']['game'] in ('foximax','polygonle','krillion')]
        self.assertEqual(len(p),7); self.assertTrue(all(x['status']=='needs_review' for x in p))
    def test_chat_not_game(self): self.assertEqual(sum(x['parsed']['status']=='unrecognized' for x in self.records),2)
    def test_bad_wordle_rows(self): self.assertEqual(parse_share('Wordle 123 2/6\n🟩🟩🟩🟩🟩')['status'],'invalid')
    def test_bad_wordle_win(self): self.assertEqual(parse_share('Wordle 123 1/6\n⬛⬛⬛⬛⬛')['status'],'invalid')
    def test_wordle_failure(self):
        r=parse_share('Wordle 123 X/6\n'+'⬛⬛⬛⬛⬛\n'*6)
        self.assertEqual(r['status'],'recognized_valid');self.assertTrue(r['fields']['completed_failure'])
    def test_bad_minute_cryptic(self): self.assertEqual(parse_share('Minute Cryptic - 7 October, 2026\n"Clue" (4)\n🏆 mystery')['status'],'ambiguous')
    def test_unrecognized(self): self.assertEqual(parse_share('Good morning!')['status'],'unrecognized')
    def test_no_auto_scoring(self): self.assertTrue(all(not r['parsed']['scoring_eligible'] for r in self.records))
if __name__=='__main__':unittest.main(verbosity=2)
