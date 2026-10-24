import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const sql=read('supabase/migrations/20261024170000_polishing_account_recovery_and_history.sql');
const edge=read('supabase/functions/competition/index.ts');
const app=read('src/ui/App.tsx');
const client=read('src/infrastructure/client.ts');
const migrationNames=readdirSync(new URL('supabase/migrations/',root)).filter(x=>x.endsWith('.sql'));
test('seventeen migrations and no historical migration rewrites in the additive package',()=>{
 assert.equal(migrationNames.length,17);
 assert.ok(migrationNames.includes('20261024170000_polishing_account_recovery_and_history.sql'));
});
test('an app verification status distinct from implicit Supabase auth confirmation is used',()=>{
 assert.match(sql,/account_email_verifications/u);assert.match(sql,/join auth\.users au/u);
 assert.match(sql,/verified_at is not null/u);assert.doesNotMatch(sql,/update\s+auth\.users\s+set\s+email_confirmed_at/iu);
});
test('unverified accounts are rejected by server-side league creation and promotion',()=>{
 assert.match(sql,/p_action='create_league' and not app_private\.p8_is_email_verified\(p_actor\)/u);
 assert.match(sql,/p_is_moderator and not app_private\.p8_is_email_verified\(p_member_user_id\)/u);
});
test('owner-only self review and normal award, decision and audit rules preserved',()=>{
 assert.match(sql,/v_req\.league_id and l\.owner_user_id=p_actor/u);
 assert.match(sql,/insert into app_private\.approval_decisions/u);
 assert.match(sql,/app_private\.p4_award\(v_sub\.id,v_req\.league_id\)/u);
 assert.match(sql,/Independent moderator reviewer required/u);
});
test('verification challenges are opaque HMAC digests, limited, expiring and single-use',()=>{
 assert.match(edge,/crypto\.subtle\.sign\('HMAC'/u);
 assert.match(sql,/interval '15 minutes'/u);assert.match(sql,/attempts>=5/u);
 assert.match(sql,/code_digest=null,expires_at=null/u);
 assert.match(sql,/last_sent_at>now\(\)-interval '90 seconds'/u);
 assert.doesNotMatch(edge,/console\.log\(code\)/u);
});
test('no email delivery key leaks to frontend, handler uses server only',()=>{
 assert.match(edge,/Deno\.env\.get\('BREVO_API_KEY'\)/u);
 assert.doesNotMatch(app,/BREVO_API_KEY|PUZZLE_VERIFY_HMAC_KEY/u);
 assert.match(edge,/p8_email_begin/u);assert.match(edge,/p8_email_confirm/u);
});
test('history is paginated, private, no arbitrary actor supplied by client',()=>{
 assert.match(sql,/account_id=p_actor and \(p_game is null/u);
 assert.match(sql,/offset greatest\(coalesce\(p_offset,0\),0\)/u);
 assert.match(edge,/p_actor:actor,p_offset:offset/u);
 assert.match(app,/Download history \(CSV\)/u);
 assert.match(app,/formula injection/u);
});
test('Find Leagues contains the invitation join; My Leagues does not',()=>{
 const find=app.split("{page === 'find-leagues'")[1]?.split("{page === 'leagues'")[0];
 const own=app.split("{page === 'leagues'")[1]?.split("{page === 'league-detail'")[0];
 assert.match(find,/Join with an invitation/u);
 assert.doesNotMatch(own,/Join with an invitation/u);
});
test('signup 422/500 responses are sanitized and password requirements visible',()=>{
 assert.match(client,/safeAuthError\(response\.status, result\)/u);
 assert.match(client,/signupPasswordRules/u);assert.match(app,/Password requirements/u);
});
test('original immutable scoring and evidence migration files remain untouched by new SQL',()=>{
 assert.doesNotMatch(sql,/update\s+public\.league_score_entries\s+set\s+performance_points\s*=\s*0/iu);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.result_submissions/iu);
});
