// Exercise real Edge dispatcher control flow, synthetic source and SQL responses only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {evaluateEvidence} from '../supabase/functions/competition/identity-evidence.mjs';
const source=readFileSync(new URL('../supabase/functions/competition/index.ts',import.meta.url),'utf8');
const code=stripTypeScriptTypes(source
 .replace(/^import\s+\{\s*parseShare,\s*previewPerformance\s*\}\s+from\s+['"]\.\/parser\.mjs['"];?\s*$/mu,'const {parseShare,previewPerformance}=__parser;')
 .replace(/^import\s+\{\s*evaluateEvidence\s*\}\s+from\s+['"]\.\/identity-evidence\.mjs['"];?\s*$/mu,'const {evaluateEvidence}=__identity;'));
const actor='00000000-0000-4000-8000-000000000001';
const fixtures=[
 ['wordle','1952','recognized_valid',{puzzle_number:1952},'published_number',{}],
 ['minute_cryptic','2026-10-23','recognized_valid',{puzzle_date:'2026-10-23',clue:'“Puzzle clue (5)”'},'published_date_clue',{official_clue:'"Puzzle clue (5)"'}],
 ['foximax','1518','needs_review',{puzzle_number:1518,fraction_denominator:8},'original_8',{}],
 ['polygonle','1545','needs_review',{puzzle_number:1545,attempt_limit_displayed:6,word_length_observed:8,pattern_header_raw:'⬢ ◣'},'standard_6to8',{official_pattern:'⬢ ◣'}],
 ['krillion','99','needs_review',{puzzle_number:99,reported_number:440,symbol_trail_raw:'🐠🐠🐠🐠🐠🐠🐠'},'daily_dive',{}]
];
function setup(game,key,status,fields,mode,optional,lookupStatus=200){
 let handler;const calls=[];
 const now=Date.now();const ref={game,identity_key:key,puzzle_day:'2026-10-23',mode:'daily',game_mode:mode,
 source_kind:'official_game',source_url:'https://example.org/official',evidence_digest:'b'.repeat(64),
 observed_at:new Date(now-60000).toISOString(),valid_until:new Date(now+3600000).toISOString(),verification_state:'verified',...optional};
 const fetcher=async (url,options={})=>{
  const path=String(url); calls.push({path,options});
  if(path.endsWith('/auth/v1/user')) return new Response(JSON.stringify({id:actor,email_confirmed_at:'2026-10-10T00:00:00Z'}));
  if(path.endsWith('/p7_identity_reference'))return new Response(JSON.stringify(lookupStatus===200?ref:{message:'Unavailable'}),{status:lookupStatus});
  if(path.endsWith('/p4_dispatch'))return new Response(JSON.stringify({submission_id:actor,awarded:0,duplicate:false}));
  if(path.endsWith('/p7_log_identity_decision'))return new Response(null,{status:204});
  throw Error('Unexpected endpoint');
 };
 runInNewContext(code,{
  Deno:{env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY'})[k]},serve:h=>{handler=h;}},
  fetch:fetcher,Response,Request,Headers,
  __identity:{evaluateEvidence}, __parser:{parseShare:raw=>({raw_text:raw,game,identity_key:key,status,fields,parser_version:'p4-1.0.0'}),previewPerformance:()=>null}
 },{timeout:1000});
 return {calls,async submit(){const r=await handler(new Request('https://test.invalid/functions/v1/competition',{method:'POST',headers:{authorization:'Bearer SYNTHEIC', 'content-type':'application/json'},body:JSON.stringify({action:'submit',data:{raw_text:'synthetic fixture',method:'paste'}})}));return {status:r.status,body:await r.json()};}};
}
for(const [game,key,status,fields,mode,optional] of fixtures){
 test(`actual Edge handler: ${game} promotes only trusted current evidence`,async()=>{
  const h=setup(game,key,status,fields,mode,optional);const res=await h.submit();
  assert.equal(res.status,200);
  const rpc=h.calls.find(c=>c.path.endsWith('/p4_dispatch'));
  assert.equal(JSON.parse(rpc.options.body).p_data.status,'recognized_valid');
  const audit=h.calls.find(c=>c.path.endsWith('/p7_log_identity_decision'));
  assert.equal(JSON.parse(audit.options.body).p_outcome,'reference_matched');
 });
 test(`actual Edge handler: ${game} source outage never upgrades pending`,async()=>{
  const h=setup(game,key,status,fields,mode,optional,503);const res=await h.submit();
  assert.equal(res.status,200);
  const rpc=h.calls.find(c=>c.path.endsWith('/p4_dispatch'));
  assert.equal(JSON.parse(rpc.options.body).p_data.status, status==='recognized_valid'?'needs_review':status);
  const audit=h.calls.find(c=>c.path.endsWith('/p7_log_identity_decision'));
  assert.equal(JSON.parse(audit.options.body).p_outcome,'pending_unverified');
 });
}

test('public submit refuses historical_import without reaching privileged RPC',async()=>{
 const [game,key,status,fields,mode,opt]=fixtures[0];
 const h=setup(game,key,status,fields,mode,opt);
 const codeOriginal=readFileSync(new URL('../supabase/functions/competition/index.ts',import.meta.url),'utf8');
 assert.match(codeOriginal,/\['paste','android_share'\]\.includes/u);
 assert.doesNotMatch(codeOriginal,/\['paste','android_share','historical_import'\]\.includes/u);
});
