import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../supabase/functions/competition/index.ts',import.meta.url),'utf8');
const safe=stripTypeScriptTypes(source
  .replace(/^import\s+\{\s*parseShare,\s*previewPerformance\s*\}\s+from\s+['"]\.\/parser\.mjs['"];?\s*$/mu,'const {parseShare,previewPerformance}=__parser;')
  .replace(/^import\s+\{\s*evaluateEvidence\s*\}\s+from\s+['"]\.\/identity-evidence\.mjs['"];?\s*$/mu,'const {evaluateEvidence}=__identity;'));
const actor='00000000-0000-4000-8000-000000000003';
const league='00000000-0000-4000-8000-000000000009';
function harness(permissionStatus=200){
  let handler;
  const paths=[];
  const fetcher=async (url,opts={})=>{
    const pathname=new URL(url).pathname;
    paths.push({path:pathname,body:opts.body??null});
    if(pathname==='/auth/v1/user') return new Response(JSON.stringify({id:actor}),{status:200});
    if(pathname==='/rest/v1/rpc/p7_pending_sources')
      return new Response(JSON.stringify(permissionStatus===200?[]:{message:'denied'}),{status:permissionStatus});
    if(pathname==='/rest/v1/rpc/p7_polishing')
      return new Response(JSON.stringify({message:'wrong dispatcher'}),{status:409});
    throw new Error('Unexpected network endpoint');
  };
  runInNewContext(safe,{Deno:{env:{get:(name)=>({SUPABASE_URL:'http://127.0.0.1:54321',SUPABASE_SERVICE_ROLE_KEY:'FAKE_SYNTHETIC'})[name]},serve:(fn)=>{handler=fn;}},
    fetch:fetcher,Request,Response,Headers,__parser:{parseShare:()=>null,previewPerformance:()=>null},
    __identity:{evaluateEvidence:()=>({verified:false})}}, {timeout:1000});
  return {paths,request:async (body,token='SYNTHETIC')=>{
    const req=new Request('http://127.0.0.1:54321/functions/v1/competition',{method:'POST',
      headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
    const response=await handler(req);return {status:response.status,body:await response.json()};
  }};
}

test('reviewer evidence uses dedicated permission-checking RPC rather than generic dispatcher',async()=>{
  const h=harness();const r=await h.request({action:'pending_sources',data:{league_id:league,p_actor:'00000000-0000-4000-8000-000000000099'}});
  assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.deepEqual(Array.from(r.body.result),[]);
  assert.equal(h.paths.some(x=>x.path.endsWith('/p7_polishing')),false);
  const call=h.paths.find(x=>x.path.endsWith('/p7_pending_sources'));
  assert.ok(call);assert.deepEqual(JSON.parse(call.body),{p_actor:actor,p_league:league});
});
test('anonymous cannot read pending sources or invoke privileged RPC',async()=>{
  const h=harness();const r=await h.request({action:'pending_sources',data:{league_id:league}},null);
  assert.equal(r.status,401);assert.equal(h.paths.length,0);
});
test('malformed league never reaches privileged RPC',async()=>{
  const h=harness();const r=await h.request({action:'pending_sources',data:{league_id:'not-a-uuid'}});
  assert.equal(r.status,400);assert.equal(h.paths.some(x=>x.path.includes('/rpc/')),false);
});
test('SQL reviewer denial propagates as denial, not successful empty list',async()=>{
  const h=harness(403);const r=await h.request({action:'pending_sources',data:{league_id:league}});
  assert.equal(r.status,403);assert.equal(r.body.ok,undefined);
});
test('service outage fails closed and produces no reviewer data',async()=>{
  const h=harness(503);const r=await h.request({action:'pending_sources',data:{league_id:league}});
  assert.equal(r.status,403);assert.equal(r.body.ok,undefined);
});
