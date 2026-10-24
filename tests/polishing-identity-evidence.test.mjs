import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvidence, GAME_IDENTITY_CONTRACTS } from '../supabase/functions/competition/identity-evidence.mjs';
import { readFileSync } from 'node:fs';
const NOW=Date.parse('2026-10-23T12:00:00Z');
const digest='a'.repeat(64);
const makeRef=(game,key,mode,extra={})=>({game,identity_key:key,puzzle_day:'2026-10-23',mode:'daily',game_mode:mode,
 source_kind:'official_game',source_url:'https://official.example.org/puzzle',evidence_digest:digest,
 observed_at:'2026-10-23T10:00:00Z',valid_until:'2026-10-24T10:00:00Z',verification_state:'verified',...extra});
const fixtures=[
 ['wordle',{game:'wordle',identity_key:'1952',status:'recognized_valid',fields:{puzzle_number:1952}},makeRef('wordle','1952','published_number')],
 ['minute_cryptic',{game:'minute_cryptic',identity_key:'2026-10-23',status:'recognized_valid',fields:{puzzle_date:'2026-10-23',clue:'“Testing clues (5)”',hints_used:3}},makeRef('minute_cryptic','2026-10-23','published_date_clue',{official_clue:'"Testing clues (5)"'})],
 ['foximax',{game:'foximax',identity_key:'1518',status:'needs_review',fields:{puzzle_number:1518,fraction_denominator:8}},makeRef('foximax','1518','original_8')],
 ['polygonle',{game:'polygonle',identity_key:'1545',status:'needs_review',fields:{puzzle_number:1545,attempt_limit_displayed:6,word_length_observed:8,pattern_header_raw:' ◢ ◣ ◢ '}},makeRef('polygonle','1545','standard_6to8',{official_pattern:'◢ ◣ ◢'})],
 ['krillion',{game:'krillion',identity_key:'99',status:'needs_review',fields:{puzzle_number:99,reported_number:440,symbol_trail_raw:'🐟🐟🐟🐟🐟🐟🐟'}},makeRef('krillion','99','daily_dive')]
];
test('all five rules are individually named, never universal date progression',()=>{
 assert.deepEqual(Object.keys(GAME_IDENTITY_CONTRACTS).sort(),fixtures.map(x=>x[0]).sort());
 assert.notEqual(GAME_IDENTITY_CONTRACTS.polygonle.reset,GAME_IDENTITY_CONTRACTS.foximax.reset);
});
for(const [game,parsed,ref] of fixtures) {
 test(`${game}: valid independently verified current reference permits status promotion only`,()=>{
   const got=evaluateEvidence(parsed,ref,NOW);
   assert.equal(got.verified,true);
   assert.equal(got.status,'recognized_valid');
   assert.equal(Object.hasOwn(got,'points'),false);
 });
 for(const [variation,mutate] of [
   ['no source',()=>null],
   ['wrong key',r=>({...r,identity_key:'invalid'})],
   ['mode conflict',r=>({...r,mode:'unlimited'})],
   ['not verified',r=>({...r,verification_state:'candidate'})],
   ['stale reference',r=>({...r,valid_until:'2026-10-22T12:00:00Z'})],
   ['future observation',r=>({...r,observed_at:'2026-10-24T12:00:00Z'})],
   ['invalid date',r=>({...r,puzzle_day:'2026-02-31'})],
   ['missing URL',r=>({...r,source_url:''})],
   ['untrusted evidence digest',r=>({...r,evidence_digest:'unverified'})]
 ]) test(`${game}: ${variation} fails closed`,()=>{
   assert.equal(evaluateEvidence(parsed,ref && mutate({...ref}),NOW).verified,false);
 });
}
test('FoxiMax variant (/6) never promoted even with matching number',()=>{
 const p=structuredClone(fixtures[2][1]);p.fields.fraction_denominator=6;
 assert.equal(evaluateEvidence(p,fixtures[2][2],NOW).verified,false);
});
test('Polygonle five-letter and tampered pattern never promoted',()=>{
 const p=structuredClone(fixtures[3][1]);p.fields.word_length_observed=5;
 assert.equal(evaluateEvidence(p,fixtures[3][2],NOW).verified,false);
 const q=structuredClone(fixtures[3][1]);q.fields.pattern_header_raw='WRONG';
 assert.equal(evaluateEvidence(q,fixtures[3][2],NOW).verified,false);
});
test('Minute Cryptic clue must match independent publisher clue, not user date only',()=>{
 const p=structuredClone(fixtures[1][1]);p.fields.clue='Other clue (5)';
 assert.equal(evaluateEvidence(p,fixtures[1][2],NOW).verified,false);
});
test('Krillion reported result never exceeds approved 700 cap',()=>{
 const p=structuredClone(fixtures[4][1]);p.fields.reported_number=701;
 assert.equal(evaluateEvidence(p,fixtures[4][2],NOW).verified,false);
});
test('ambiguous and invalid shares cannot be promoted even with reference',()=>{
 for(const status of ['invalid','ambiguous','unrecognized']){
   assert.equal(evaluateEvidence({...fixtures[0][1],status},fixtures[0][2],NOW).verified,false);
 }
});
test('identity migration is additive and all writes operator-only; no automated historical award',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261023100200_polishing_identity_evidence.sql',import.meta.url),'utf8');
 assert.match(sql,/current_user not in \('postgres','supabase_admin'\)/u);
 assert.match(sql,/revoke all on function app_private\.p7_register_daily_reference/u);
 assert.match(sql,/r\.status='pending'/u);
 assert.doesNotMatch(sql,/\b(?:insert|update|delete)\s+(?:into|from)?\s*public\.league_score_entries/iu);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.result_submissions/iu);
});

test('Minute Cryptic realistic publisher curly quotes around clue with external enumeration match',()=>{
 const p=structuredClone(fixtures[1][1]);
 p.fields.clue='“Conditions of entry in Ironwomen v. Ironmen tournament” (11)';
 const ref={...fixtures[1][2], official_clue:'"Conditions of entry in Ironwomen v. Ironmen tournament" (11)'};
 assert.equal(evaluateEvidence(p,ref,NOW).verified,true);
});
