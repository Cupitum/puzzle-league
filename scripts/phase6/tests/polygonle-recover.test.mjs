import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRow} from '../polygonle-recover.mjs';
const good=`#Polygonle 1539 🎯/6\nABCCBBA\n🟩🟩🟩🟩🟩🟩🟩\n🔥 streak: 4`;
const row={game_id:'polygonle',review_status:'pending',parse_status:'ambiguous',puzzle_id:null,
 review_count:1,decision_count:0,award_count:0,reparse_count:0,parser_version:'p4-1.0.0',raw_share_text:good};
test('only unlinked and pending 1539 share passes structural gate',()=>{const x=assessRow(row);assert.deepEqual(x.problems,[]);assert.equal(x.p.fields.puzzle_date,null);assert.equal(x.p.fields.attempts,1);});
test('linked puzzle, existing awards, moderation decision all fail closed',()=>{
 for(const change of [{puzzle_id:'1'},{award_count:1},{decision_count:1},{review_status:'accepted'},{reparse_count:1}])assert.ok(assessRow({...row,...change}).problems.length>0);
});
test('different number and 5-cell result cannot be imported',()=>{
 assert.ok(assessRow({...row,raw_share_text:good.replace('1539','1540')}).problems.length>0);
 assert.ok(assessRow({...row,raw_share_text:good.replace('🟩🟩🟩🟩🟩🟩🟩','🟩🟩🟩🟩🟩')}).problems.length>0);
});
test('parser / status / prior-review guards fail closed',()=>{
 for(const change of [{parser_version:null},{parse_status:'needs_review'},{review_count:0}])assert.ok(assessRow({...row,...change}).problems.length>0);
});
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const migration=readFileSync(resolve(import.meta.dirname,'../../../supabase/migrations/20261018150000_phase6_unlinked_polygonle_recovery.sql'),'utf8');
test('forward-only SQL never updates puzzle IDs, awards or moderation states',()=>{
 assert.match(migration,/v_old\.puzzle_id is not null/);
 assert.match(migration,/v_old\.review_status <> 'pending'/);
 assert.match(migration,/v_old\.parse_status <> 'ambiguous'/);
 assert.match(migration,/v_old\.parsed_fields is distinct from p_expected_fields/);
 assert.match(migration,/p6_pending_reparse_events/);
 assert.match(migration,/revoke all on function app_private\.p6_reparse_unlinked_polygonle/);
 assert.match(migration,/set parser_version=p_new_parser, parse_status='needs_review', parsed_fields=p_new_fields/);
 assert.doesNotMatch(migration,/update\s+public\.game_puzzles|update\s+public\.league_score_entries|update\s+app_private\.approval_requests/i);
});

test('synthetic database test contains explicit rollback',()=>{
 const t=readFileSync(resolve(import.meta.dirname,'../../../supabase/tests/phase6_unlinked_polygonle_rollback.sql'),'utf8');
 assert.match(t,/BEGIN;/);
 assert.match(t,/ROLLBACK;/);
 assert.match(t,/has_function_privilege\('authenticated'/);
 assert.match(t,/v_raw text := '#Polygonle 1539/);
});
