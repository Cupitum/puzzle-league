import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parsePrivateStatus} from '../scripts/polishing/local_live_auth_edge.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const py=resolve(root,'scripts/polishing/make_live_auth_config.py');
const script=readFileSync(resolve(root,'scripts/polishing/local_live_auth_edge_gate.sh'),'utf8');
const handler=readFileSync(resolve(root,'scripts/polishing/local_live_auth_edge.mjs'),'utf8');
const fixture='API_URL=http://127.0.0.1:57575\nANON_KEY='+('X'.repeat(80))+'\nSERVICE_ROLE_KEY='+('Y'.repeat(80))+'\n';

test('local Supabase env parser accepts bare loopback host only',()=>{
 assert.equal(parsePrivateStatus(fixture).base,'http://127.0.0.1:57575');
});
for (const bad of ['https://public.example.com','http://localhost:57575','http://127.0.0.1:57575/foo',
 'http://127.0.0.1:57575/?token=x','http://user:pw@127.0.0.1:57575']){
 test('reject remote or modified API endpoint '+bad,()=>{
  assert.throws(()=>parsePrivateStatus(fixture.replace('http://127.0.0.1:57575',bad)));
 });
}
test('missing local service role key fails',()=>{
 assert.throws(()=>parsePrivateStatus(fixture.replace('Y'.repeat(80),'')));
});
test('runner strips remote project credential environment',()=>{
 assert.match(script,/unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE/);
});
test('runner requires an isolated Docker bridge and binds 127.0.0.1',()=>{
 assert.match(script,/host_binding_ipv4=127\.0\.0\.1/);
 assert.match(script,/non-local Docker port/);
});
test('runner never references live project or applies hosted migrations',()=>{
 for(const forbidden of ['jwmqhnorcwtgcoqisffh','puzzle-league-pilot.pages.dev','supabase db push','supabase link','supabase functions deploy'])
  assert.ok(!script.includes(forbidden),'forbidden live command/reference');
});
test('integration test executes real local GoTrue + PostgREST and checks auth scopes',()=>{
 assert.match(handler,/\/auth\/v1\/signup/);
 assert.match(handler,/\/auth\/v1\/token\?grant_type=password/);
 assert.match(handler,/\/auth\/v1\/user/);
 assert.match(handler,/\/rest\/v1\/rpc\/p7_polishing/);
 assert.match(handler,/cross-league outsider/);
 assert.match(handler,/new moderator roster only/);
 assert.match(handler,/revocation immediately denies/);
 assert.match(handler,/deletion register/);
});
test('config generator changes only scratch project ID and local options',()=>{
 const scratch=mkdtempSync(resolve(tmpdir(),'pzl-auth-test-'));
 try {
  const source=resolve(root,'supabase/config.toml');
  const output=resolve(scratch,'config.toml');
  const result=spawnSync('python3',[py,source,output,'pzlauth_1234abcd'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const data=readFileSync(output,'utf8');
  assert.match(data,/project_id\s*=\s*"pzlauth_1234abcd"/);
  assert.match(data,/\[auth\.email\][\s\S]*?enable_confirmations\s*=\s*false/);
  assert.match(data,/\[auth\]\nenabled\s*=\s*true/);
  assert.match(data,/\[api\]\nenabled\s*=\s*true/);
  assert.match(data,/\[studio\]\nenabled\s*=\s*false/);
  const retry=spawnSync('python3',[py,source,output,'pzlauth_1234abcd'],{encoding:'utf8'});
  assert.notEqual(retry.status,0,'must refuse scratch config overwrite');
 } finally {rmSync(scratch,{recursive:true,force:true});}
});
test('reject malformed synthetic project IDs',()=>{
 const scratch=mkdtempSync(resolve(tmpdir(),'pzl-auth-test-'));
 try {
  const result=spawnSync('python3',[py,resolve(root,'supabase/config.toml'),resolve(scratch,'config'),'some_remote'],{encoding:'utf8'});
  assert.notEqual(result.status,0);
 } finally {rmSync(scratch,{recursive:true,force:true});}
});
