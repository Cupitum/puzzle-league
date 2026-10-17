import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseShare, previewPerformance } from '../../../supabase/functions/competition/parser.mjs';
const sample = '#Polygonle 1539 🎯/6︎\n ◆︎  ⬢︎  ⬢︎  ◢︎  ⬢︎  ◤︎ \n🟩🟩🟩🟩🟩🟩\n\n🔥 streak:1\nhttps://www.polygonle.com';
test('user-supplied Polygonle target emoji parses as first attempt without award', () => {
 const p=parseShare(sample);
 assert.equal(p.game,'polygonle');
 assert.equal(p.status,'needs_review');
 assert.equal(p.identity_key,'1539');
 assert.equal(p.fields.attempts,1);
 assert.equal(p.fields.word_length_observed,6);
 assert.equal(p.fields.completed_failure,false);
 assert.equal(p.fields.streak_displayed,1);
 assert.equal(previewPerformance(p),10);
 assert.equal(p.verified_identity,false);
 assert.equal(p.awarded,false);
 assert.equal(p.fields.puzzle_date,null);
});
test('target glyph cannot bypass grid validation',()=>{
 assert.equal(parseShare(sample.replace('🟩🟩🟩🟩🟩🟩','🟩🟩🟩⬛🟩🟩')).status,'invalid');
 assert.equal(parseShare(sample.replace('🟩🟩🟩🟩🟩🟩','🟩🟩🟩🟩🟩🟩\n🟩🟩🟩🟩🟩🟩')).status,'invalid');
});
test('numeric Polygonle and failure marker retain existing semantics',()=>{
 const one=parseShare(sample.replace('🎯/6︎','1/6︎'));
 assert.equal(one.fields.attempts,1);
 const sixRows=Array(6).fill('⬛'.repeat(6)).join('\n');
 const failed=parseShare('#Polygonle 1539 😔/6︎\n◆⬢⬢◢⬢◤\n'+sixRows+'\n🔥 streak:0');
 assert.equal(failed.status,'needs_review');
 assert.equal(failed.fields.completed_failure,true);
 assert.equal(previewPerformance(failed),0);
});
