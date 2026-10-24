// Offline deterministic Edge transport test. Does NOT prove live GoTrue, JWT
// signatures, deployed RLS, SMTP delivery, or restored-user sign-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'supabase/functions/competition/index.ts');
const validActor = '10000000-0000-4000-8000-000000000001';
const otherActor = '20000000-0000-4000-8000-000000000002';
const serviceSecret = 'synthetic-test-service-key-NOT-A-REAL-KEY';

function harness({
  userStatus = 200,
  userId = validActor,
  confirmed = true,
  loginStatus = 200,
  loginUser = validActor,
  rpcStatus = 200,
  throwUser = false,
  throwRpc = false,
  config = true,
} = {}) {
  const calls = [];
  let handler;
  const raw = readFileSync(source, 'utf8');
  assert.match(raw, /^import\s+\{\s*parseShare,\s*previewPerformance\s*\}\s+from\s+['"]\.\/parser\.mjs['"];?/m);
  const substituted = raw.replace(/^import\s+\{\s*parseShare,\s*previewPerformance\s*\}\s+from\s+['"]\.\/parser\.mjs['"];?\s*$/m,
    'const {parseShare, previewPerformance} = __parser;');
  const resolved = substituted.replace(/^import\s+\{\s*evaluateEvidence\s*\}\s+from\s+['"]\.\/identity-evidence\.mjs['"];?\s*$/m, 'const {evaluateEvidence} = __identity;');
  const transformed = stripTypeScriptTypes(resolved);
  const env = config ? {
    SUPABASE_URL: 'https://local.invalid',
    SUPABASE_SERVICE_ROLE_KEY: serviceSecret,
  } : {};
  const fetchMock = async (url, options = {}) => {
    const uri = String(url);
    calls.push({uri, options});
    if (uri.endsWith('/auth/v1/user')) {
      if (throwUser) throw new Error('synthetic GoTrue outage');
      return new Response(JSON.stringify({id: userId,
        email: 'synthetic@example.invalid',
        email_confirmed_at: confirmed ? '2026-10-01T00:00:00Z' : null}),
      {status:userStatus,headers:{'content-type':'application/json'}});
    }
    if (uri.includes('/auth/v1/token?')) return new Response(JSON.stringify({user:{id:loginUser}}),
      {status:loginStatus,headers:{'content-type':'application/json'}});
    if (uri.includes('/rest/v1/rpc/')) {
      if (throwRpc) throw new Error('synthetic PostgREST outage');
      return new Response(JSON.stringify({mock_receipt:true}),
        {status:rpcStatus,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected outbound endpoint: ' + uri);
  };
  const sandbox = {
    Deno: {env:{get: (key)=>env[key]},serve(fn){ handler=fn;}},
    fetch:fetchMock, Response, Request, Headers,
    __identity:{evaluateEvidence:()=>({verified:false,reason:'no_independent_reference'})},
    __parser:{
      parseShare(text){return {raw_text:text,game:'wordle',status:'needs_review',identity_key:null,
        fields:{},parser_version:'test-parser-v0'};},
      previewPerformance(){return null;},
    },
  };
  vm.runInNewContext(transformed, sandbox, {filename:'competition/index.ts',timeout:1000});
  assert.equal(typeof handler, 'function');
  async function send(action,{data={},token='synthetic.jwt.opaque',method='POST',bodyOverride,headers={}} = {}) {
    const payload = bodyOverride ?? {action,data};
    const req = new Request('https://local.invalid/functions/v1/competition', {
      method,
      ...(method==='POST' ? {body:JSON.stringify(payload)}:{}),
      headers:{...(token ? {Authorization:`Bearer ${token}`} : {}), 'content-type':'application/json',...headers},
    });
    const res = await handler(req);
    return {status:res.status,headers:res.headers,body:await res.json()};
  }
  return {send,calls};
}
const rpcCalls = h => h.calls.filter(c=>c.uri.includes('/rest/v1/rpc/'));

test('anonymous protected operations are denied before service-role RPC',async()=>{
  const h=harness(); const r=await h.send('roster',{token:null});
  assert.equal(r.status,401); assert.equal(h.calls.length,0);
});
test('OPTIONS preflight does not require a credential or cause backend calls',async()=>{
  const h=harness();const r=await h.send('roster',{method:'OPTIONS',token:null});
  assert.equal(r.status,200);assert.equal(h.calls.length,0);
});
test('unknown actions cannot invoke the privileged dispatcher',async()=>{
  const h=harness();const r=await h.send('delete_everything');
  assert.equal(r.status,400);assert.equal(rpcCalls(h).length,0);
});
test('invalid JSON/action type rejected before auth',async()=>{
  const h=harness();const r=await h.send(null,{token:null,bodyOverride:{action:{admin:true}}});
  assert.equal(r.status,400);assert.equal(h.calls.length,0);
});
test('missing environment blocks without network calls',async()=>{
  const h=harness({config:false});const r=await h.send('roster');
  assert.equal(r.status,503);assert.equal(h.calls.length,0);
});
test('invalid signed-in session denied with no RPC',async()=>{
  const h=harness({userStatus:401});const r=await h.send('roster');
  assert.equal(r.status,401);assert.equal(rpcCalls(h).length,0);
});
test('invalid subject id denied with no RPC',async()=>{
  const h=harness({userId:'forged'});const r=await h.send('roster');
  assert.equal(r.status,401);assert.equal(rpcCalls(h).length,0);
});
test('GoTrue network failure fails closed',async()=>{
  const h=harness({throwUser:true});const r=await h.send('roster');
  assert.equal(r.status,503);assert.equal(rpcCalls(h).length,0);
});
test('client-controlled p_actor cannot replace authenticated actor',async()=>{
  const h=harness();const r=await h.send('roster',{data:{league_id:'some-league',p_actor:otherActor}});
  assert.equal(r.status,200);
  const c=rpcCalls(h);assert.equal(c.length,1);
  assert.ok(c[0].uri.endsWith('/p7_polishing'));
  const payload=JSON.parse(c[0].options.body);
  assert.equal(payload.p_actor,validActor);
  assert.equal(payload.p_action,'roster');
});
test('direct privileged SQL action cannot be selected by caller',async()=>{
  const h=harness();const r=await h.send('p7_admin_deletion_status');
  assert.equal(r.status,400);assert.equal(rpcCalls(h).length,0);
});
test('old dispatch action still pins actor from GoTrue',async()=>{
  const h=harness();const r=await h.send('my_leagues',{data:{p_actor:otherActor}});
  assert.equal(r.status,200);const c=rpcCalls(h);assert.equal(c.length,1);
  assert.ok(c[0].uri.endsWith('/p4_dispatch'));
  assert.equal(JSON.parse(c[0].options.body).p_actor,validActor);
});
test('anonymous standings remains read-only routed',async()=>{
  const h=harness();const r=await h.send('standings',{token:null});
  assert.equal(r.status,200);assert.equal(h.calls.length,1);
  const payload=JSON.parse(rpcCalls(h)[0].options.body);
  assert.equal(payload.p_action,'standings');assert.equal(payload.p_actor,null);
});
test('RPC permission rejection is not reported as success',async()=>{
  const h=harness({rpcStatus:403});const r=await h.send('manage_member');
  assert.equal(r.status,403);assert.equal(r.body.error,'Permission denied');
});
test('RPC network failure fails closed',async()=>{
  const h=harness({throwRpc:true});const r=await h.send('set_permission');
  assert.equal(r.status,503);
});
test('account-deletion request requires confirmed email and current password',async()=>{
  const h=harness({confirmed:false});const r=await h.send('request_deletion',{data:{current_password:'password123'}});
  assert.equal(r.status,403);assert.equal(h.calls.filter(c=>c.uri.includes('/auth/v1/token')).length,0);
});
test('account deletion rejects incorrect password and does not record request',async()=>{
  const h=harness({loginStatus:400});const r=await h.send('request_deletion',{data:{current_password:'password123'}});
  assert.equal(r.status,403);assert.equal(rpcCalls(h).length,0);
});
test('account deletion rejects password for a different authenticated user',async()=>{
  const h=harness({loginUser:otherActor});const r=await h.send('request_deletion',{data:{current_password:'password123'}});
  assert.equal(r.status,403);assert.equal(rpcCalls(h).length,0);
});
test('successful reauthentication discards password before any RPC; user id pinned',async()=>{
  const h=harness();const r=await h.send('request_deletion',{
    data:{current_password:'SyntheticPassword123!',p_actor:otherActor}});
  assert.equal(r.status,200);
  const c=rpcCalls(h);assert.equal(c.length,1);
  const payload=JSON.parse(c[0].options.body);
  assert.equal(payload.p_actor,validActor);
  assert.ok(!Object.hasOwn(payload.p_data,'current_password'));
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.ok(!JSON.stringify(r.body).includes('SyntheticPassword123!'));
});
test('deletion status does not create password challenge',async()=>{
  const h=harness();const r=await h.send('deletion_status');
  assert.equal(r.status,200);assert.equal(h.calls.filter(c=>c.uri.includes('/auth/v1/token')).length,0);
});
test('oversized claimed content length is rejected before GoTrue',async()=>{
  const h=harness();const r=await h.send('roster',{headers:{'content-length':'22000'}});
  assert.equal(r.status,413);assert.equal(h.calls.length,0);
});
test('an unsupported HTTP method never touches auth or RPC',async()=>{
  const h=harness();const r=await h.send('roster',{method:'GET'});
  assert.equal(r.status,405);assert.equal(h.calls.length,0);
});
