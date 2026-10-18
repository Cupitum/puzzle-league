import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseShare,previewPerformance} from '../../../supabase/functions/competition/parser.mjs';
const raw='#Polygonle 1539 🎯/6︎\n◆⬢⬢◢⬢◤\n🟩🟩🟩🟩🟩🟩\n🔥 streak:1';
test('Polygonle target parsed but cannot certify daily date or award',()=>{
 const p=parseShare(raw.replaceAll('\\n','\n'));
 assert.equal(p.game,'polygonle');assert.equal(p.fields.attempts,1);
 assert.equal(p.status,'needs_review');assert.equal(p.fields.puzzle_date,null);
 assert.equal(previewPerformance(p),10);assert.equal(p.awarded,false);
});
test('reconciliation path is read-only and SQL operator path guards awarded history',()=>{
 const js=readFileSync('scripts/phase6/reconcile.mjs','utf8');
 assert.match(js,/begin transaction read only/i);
 assert.doesNotMatch(js,/p4_dispatch|update public\.result_submissions/i);
 const sql=readFileSync('supabase/migrations/20261018100000_phase6_pending_reparse_audit.sql','utf8');
 assert.match(sql,/review_status <> 'pending'/);
 assert.match(sql,/league_score_entries/);assert.match(sql,/approval_decisions/);
 assert.match(sql,/prevent_audit_history_mutation/);
});
