import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseShare,previewPerformance,RULE_VERSIONS} from '../../../supabase/functions/competition/parser.mjs';
const corpus='research/phase1-approved-local-poc/wordlegroup_five_game_anonymized.jsonl';
const lines=readFileSync(corpus,'utf8').trim().split('\n').map(JSON.parse);
const byGame={wordle:0,minute_cryptic:0,foximax:0,polygonle:0,krillion:0};
test('all five signed-off scoring IDs are immutable',()=>{
 assert.deepEqual(RULE_VERSIONS,{wordle:'wordle-fixed-v1-approved',
 minute_cryptic:'minute-cryptic-hints-v1-approved',foximax:'foximax-original-n8-v1-approved',
 polygonle:'polygonle-standard-v1-approved',krillion:'krillion-daily-absolute700-v1-approved'});
});
test('Wordle six wins, failure, malformed and comment',()=>{
 for(let a=1;a<=6;a++) {
   const rows=Array.from({length:a},(_,i)=>i===a-1?'🟩'.repeat(5):'⬛'.repeat(5)).join('\n');
   const p=parseShare(`Wordle 1940 ${a}/6\n${rows}`);
   assert.equal(p.status,'recognized_valid');assert.equal(previewPerformance(p),[10,8,6,4,2,1][a-1]);
 }
 const fail=parseShare('Wordle 1941 X/6\n'+Array(6).fill('⬛'.repeat(5)).join('\n'));
 assert.equal(previewPerformance(fail),0);
 assert.equal(parseShare('Wordle 1940 4/6\n'+Array(4).fill('⬛'.repeat(5)).join('\n')).status,'invalid');
 assert.equal(parseShare('Wordle 1940 1/6\n🟩🟩🟩🟩🟩\nprivate note').status,'needs_review');
});
test('scoring rejects unsupported Polygonle 5-letter, FoxiMax variants, Krillion out of range',()=>{
 assert.equal(previewPerformance({game:'polygonle',status:'needs_review',fields:{attempt_limit_displayed:6,word_length_observed:5,completed_failure:false,attempts:3}}),null);
 assert.equal(previewPerformance({game:'foximax',status:'needs_review',fields:{fraction_denominator:7,completed_failure:false,fraction_numerator:2}}),null);
 assert.equal(previewPerformance({game:'krillion',status:'needs_review',fields:{reported_number:701}}),null);
 assert.equal(previewPerformance({game:'krillion',status:'needs_review',fields:{reported_number:35}}),1);
});
test('puzzle candidate is NEVER a verified date or server award',()=>{
 const p=parseShare('Wordle 1940 1/6\n🟩🟩🟩🟩🟩');
 assert.equal(p.identity_key,'1940');assert.equal(p.verified_identity,false);assert.equal(p.awarded,false);
 assert.equal(p.fields.puzzle_date,null);
});
test('real pseudonymised five-game corpus: 258 syntax parse attempts',()=>{
 for(const record of lines) {
   const source=record.raw_text??record.text??record.share_text??record.raw_share_text;
   if(typeof source!=='string')throw Error('Unknown fixture text field');
   const p=parseShare(source);
   if(p.game in byGame)byGame[p.game]++;
   assert.equal(p.awarded,false);
   assert.equal(p.verified_identity,false);
 }
 assert.equal(lines.length,258);
 assert.deepEqual(byGame,{wordle:116,minute_cryptic:33,foximax:70,polygonle:18,krillion:21});
});
test('five approved rules: boundary and participation preview',()=>{
 const make=(game,fields,status='needs_review')=>previewPerformance({game,fields,status});
 assert.equal(make('minute_cryptic',{hints_used:0},'recognized_valid'),10);
 assert.equal(make('minute_cryptic',{hints_used:12},'recognized_valid'),0);
 for(let i=1;i<=8;i++)
  assert.equal(make('foximax',{fraction_denominator:8,fraction_numerator:i,completed_failure:false}),
  [10,9,7,6,5,4,2,1][i-1]);
 assert.equal(make('foximax',{fraction_denominator:8,fraction_numerator:null,completed_failure:true}),0);
 for(let i=1;i<=6;i++)
  assert.equal(make('polygonle',{attempt_limit_displayed:6,word_length_observed:7,
    completed_failure:false,attempts:i}),[10,8,6,4,2,1][i-1]);
 assert.equal(make('polygonle',{attempt_limit_displayed:6,word_length_observed:8,
    completed_failure:true,attempts:null}),0);
 assert.equal(make('krillion',{reported_number:0}),0);
 assert.equal(make('krillion',{reported_number:34}),0);
 assert.equal(make('krillion',{reported_number:35}),1);
 assert.equal(make('krillion',{reported_number:440}),6);
 assert.equal(make('krillion',{reported_number:700}),10);
});
