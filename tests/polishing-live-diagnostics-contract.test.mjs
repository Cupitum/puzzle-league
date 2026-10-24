import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const runner=readFileSync(new URL('../scripts/polishing/local_live_auth_edge.mjs',import.meta.url),'utf8');
const handler=readFileSync(new URL('../supabase/functions/competition/index.ts',import.meta.url),'utf8');
test('auth integration reports only fixed stage and SQLSTATE, never error bodies',()=>{
  assert.match(runner,/FAILURE_GATE_STAGE: /u);
  assert.match(runner,/FAILURE_SQLSTATE: /u);
  assert.match(runner,/FAILURE_HTTP_STATUS: /u);
  assert.match(runner,/VERBOSITY=sqlstate/u);
  assert.doesNotMatch(runner,/process\.(?:stdout|stderr)\.write\((?:String\()?err\.(?:message|stack)/u);
});
test('operator evidence test labels its protected registry write and ACL checks',()=>{
  for(const stage of ['identity_operator_registration','identity_public_acl','identity_privileged_lookup','identity_unknown_reference','reviewer_evidence_route'])
    assert.ok(runner.includes(`gateStage='${stage}'`),`missing diagnostic stage ${stage}`);
});
test('pending_sources dedicated endpoint remains reachable and guarded',()=>{
  assert.match(handler,/if\(action==='pending_sources'\)/u);
  const set=handler.match(/const protectedPolish=new Set\(\[([\s\S]*?)\]\);/u);
  assert.ok(set);assert.doesNotMatch(set[1],/pending_sources/u);
  assert.match(handler,/p7_pending_sources/u);
});
