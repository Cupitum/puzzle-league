import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseShare, previewPerformance} from '../../../supabase/functions/competition/parser.mjs';
import {ANCHORS, ANCHOR_DAY, DAILY_IDENTITY_VERSION, calendarOrdinal,
  expectedPuzzleId, serverLocalDay, dateIdentityDecision} from '../../../supabase/functions/competition/daily-identity.mjs';
const NOW=Date.parse('2026-10-25T10:00:00.000Z');
const path='supabase/migrations/20261025120000_p9_local_calendar_identity.sql';
const sql=readFileSync(path,'utf8');
const edge=readFileSync('supabase/functions/competition/index.ts','utf8');
const ui=readFileSync('src/ui/App.tsx','utf8');
const wordle=(number=1954,tries=4)=>parseShare(`Wordle ${number} ${tries}/6\n${Array.from({length:tries},(_,i)=>i===tries-1?'🟩'.repeat(5):'⬛'.repeat(5)).join('\n')}`);
const fox=(number=1520)=>parseShare(`🦊#FoxiMax #${number} 2/8 (5 letters)\n${'⬛'.repeat(5)}\n${'🟩'.repeat(5)}`);
const poly=(number=1547)=>parseShare(`#Polygonle ${number} 🎯/6\n⬡⬡⬡⬡⬡⬡\n${'🟩'.repeat(6)}`);
const krillion=(number=102)=>parseShare(`Krillion #${number} 🌊\n350\n🔹🔹🔹🔹🔹🔹🔹`);
const cryptic=(day=25)=>parseShare(`Minute Cryptic - ${day} October, 2026\n“Example clue” (6)\n🏆 1 hint – 2 under the community par (200 solvers so far).\nhttps://minutecryptic.com/`);

test('owner-approved reference numbers and all five next days',()=>{
  assert.equal(ANCHOR_DAY,'2026-10-25');
  assert.deepEqual(ANCHORS,{wordle:1954,foximax:1520,krillion:102,polygonle:1547});
  for(const [g,n] of Object.entries(ANCHORS)){
    assert.equal(expectedPuzzleId(g,'2026-10-25'),String(n));
    assert.equal(expectedPuzzleId(g,'2026-10-26'),String(n+1));
    assert.equal(expectedPuzzleId(g,'2026-10-24'),String(n-1));
  }
  assert.equal(expectedPuzzleId('minute_cryptic','2026-10-25'),'2026-10-25');
  assert.equal(expectedPuzzleId('minute_cryptic','2026-10-26'),'2026-10-26');
});

test('calendar arithmetic rejects invalid day and handles leap years and months',()=>{
  assert.equal(expectedPuzzleId('wordle','2021-06-19'),null); // number 0 is not a daily puzzle ID
  assert.equal(expectedPuzzleId('wordle','2021-06-20'),'1');
  assert.equal(calendarOrdinal('2024-02-29')-calendarOrdinal('2024-02-28'),1);
  for(const d of ['2026-02-29','2026-13-01','2026-10-32','2026-1-25','not-a-date']){
    assert.equal(calendarOrdinal(d),null);
  }
  assert.equal(expectedPuzzleId('other_game','2026-10-25'),null);
});

test('local offset maps midnight to player day; never uses server day blindly',()=>{
  assert.equal(serverLocalDay(-480,Date.parse('2026-10-24T16:01:00Z')),'2026-10-25');
  assert.equal(serverLocalDay(-120,Date.parse('2026-10-24T22:01:00Z')),'2026-10-25');
  assert.equal(serverLocalDay(300,Date.parse('2026-10-26T03:59:00Z')),'2026-10-25');
  assert.equal(serverLocalDay(0,Date.parse('2026-10-26T00:00:00Z')),'2026-10-26');
  assert.equal(serverLocalDay(900,NOW),null);
  assert.equal(serverLocalDay(5,NOW),null);
  assert.equal(serverLocalDay(3.5,NOW),null);
});

test('valid five-game shares accept the local date; historical/future mismatch is pending',()=>{
  const shares=[wordle(),fox(),poly(),krillion(),cryptic()];
  for(const parsed of shares){
    assert.notEqual(previewPerformance(parsed),null,parsed.game);
    const resolved=dateIdentityDecision(parsed,'2026-10-25',0,NOW);
    assert.equal(resolved.status,'recognized_valid',parsed.game+': '+resolved.reason);
    assert.equal(resolved.verified,true);
    assert.equal(resolved.method,DAILY_IDENTITY_VERSION);
    const yesterday=dateIdentityDecision(parsed,'2026-10-26',0,Date.parse('2026-10-26T10:00:00Z'));
    assert.equal(yesterday.status,'needs_review',parsed.game);
    assert.equal(yesterday.verified,false);
  }
});

test('never override ambiguity, Wordle trailing note, unsupported game mode or broken Krillion',()=>{
  const trailing=parseShare('Wordle 1954 1/6\n🟩🟩🟩🟩🟩\nprivate note');
  assert.equal(dateIdentityDecision(trailing,'2026-10-25',0,NOW).verified,false);
  const five=poly(); five.fields.word_length_observed=5;
  assert.equal(dateIdentityDecision(five,'2026-10-25',0,NOW).verified,false);
  const modified=fox(); modified.fields.fraction_denominator=7;
  assert.equal(dateIdentityDecision(modified,'2026-10-25',0,NOW).verified,false);
  const broken=krillion(); broken.fields.symbol_trail_raw='🔹';
  assert.equal(dateIdentityDecision(broken,'2026-10-25',0,NOW).verified,false);
  assert.equal(dateIdentityDecision({status:'invalid',game:'wordle'},'2026-10-25',0,NOW).status,'invalid');
  assert.equal(dateIdentityDecision(wordle(),'2026-10-24',0,NOW).verified,false);
  assert.equal(dateIdentityDecision(wordle(),null,0,NOW).verified,false);
  assert.equal(dateIdentityDecision(wordle(),'2026-10-25',840,NOW).verified,false);
});

test('deployment contract: no independent evidence fetch, SQL server-side recheck, duplicate and moderator gates',()=>{
  assert.match(edge,/dateIdentityDecision\(p,claimedDay,claimedOffset\)/);
  assert.doesNotMatch(edge,/rpc\/p7_identity_reference/);
  assert.match(edge,/identity_method:DAILY_IDENTITY_VERSION/);
  assert.match(ui,/getTimezoneOffset\(\)/);
  assert.match(ui,/local_day: localDay/);
  assert.match(sql,/app_private\.p9_day_from_key\(v_game,v_key\)/);
  assert.match(sql,/app_private\.p9_local_today\(v_offset,v_now\)/);
  assert.match(sql,/v_day_from_key is distinct from v_server_local_day/);
  assert.match(sql,/join public\.game_puzzles q on q\.id=s\.puzzle_id/);
  assert.match(sql,/and q\.identity_key=v_key/);
  assert.match(sql,/then 'historical_exception' else 'submission_review'/);
  assert.match(sql,/select \* into strict v_puz from public\.game_puzzles/);
  assert.match(sql,/app_private\.p4_award\(v_submission\)/);
  assert.doesNotMatch(sql,/update public\.result_submissions.*where submitted_at/u);
});
