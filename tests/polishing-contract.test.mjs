// Static defense-in-depth contracts. NOT substitutes for SQL/RLS integration tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const permissions=read('supabase/migrations/20261023100000_polishing_permissions_and_requests.sql');
const streak=read('supabase/migrations/20261023100100_polishing_verified_streak.sql');
const edge=read('supabase/functions/competition/index.ts');
const original=read('supabase/migrations/20261015100100_phase4_competition_functions.sql');
test('additive migration leaves thirteen historical SQL files unchanged',()=>{
  const a=readdirSync(new URL('../supabase/migrations/',import.meta.url));
  assert.equal(a.filter(x=>/^202610(12|13|14|15|17|18)/u.test(x)).length,13);
  assert.match(original,/create function app_private\.p4_points/u);
});
test('service role only protected transport and no client accessible delete table',()=>{
  assert.match(permissions,/grant execute on function public\.p7_polishing\(uuid,text,jsonb\) to service_role/u);
  assert.match(permissions,/revoke all on app_private\.account_deletion_requests,app_private\.account_deletion_audit from public,anon,authenticated/u);
  assert.doesNotMatch(permissions,/delete\s+from\s+auth\.users/iu);
});
test('moderator grant is owner-only and checks active moderator membership',()=>{
  assert.match(permissions,/if not app_private\.p7_is_owner\(p_actor,v_league\)/u);
  assert.match(permissions,/user_id=v_user and role='moderator' and left_at is null for update/u);
  assert.match(permissions,/v_perm not in \('manage_invitations','manage_members'\)/u);
});
test('moderator ordinary member management excludes owner, self and moderators',()=>{
  assert.match(permissions,/v_user=p_actor or v_user=\(select owner_user_id/u);
  assert.match(permissions,/v_role<>'member'/u);
  assert.match(permissions,/p_action='manage_member'/u);
});
test('historical suggestions cannot alter awards, submissions or review decisions',()=>{
  const start=permissions.indexOf("elsif p_action='pending_evidence'");
  const end=permissions.indexOf("raise exception 'Unknown protected operation'",start);
  const b=permissions.slice(start,end);
  assert.match(b,/r\.status='pending'/u);
  assert.match(b,/keep_pending_verify_source/u);
  assert.doesNotMatch(b,/\b(update|insert|delete)\b/iu);
});
test('verified streak uses immutable recorded awards not guessed days',()=>{
  assert.match(streak,/join public\.league_score_entries|from public\.league_score_entries/u);
  assert.match(streak,/gp\.verification_state='verified'/u);
  assert.match(streak,/p_day-1/u);
  assert.doesNotMatch(streak,/app_private\.p4_points/u);
});
test('Edge verifies existing email and fresh password, removes secret before RPC',()=>{
  assert.match(edge,/subject\.email_confirmed_at/u);
  assert.match(edge,/token\?grant_type=password/u);
  assert.match(edge,/fresh\?\.user\?\.id!==actor/u);
  assert.match(edge,/delete data\.current_password/u);
  assert.match(edge,/p7_polishing/u);
});
test('no additional automatic historical award or point calculation',()=>{
  assert.doesNotMatch(permissions,/p4_award|league_score_entries/u);
  assert.doesNotMatch(streak,/insert into public\.league_score_entries/u);
});

// Regression for SQL runtime roster projection: the UNION column must be named
// role because the outer JSON projection references x.role. This is a static
// guard only; the isolated database roster RPC test remains mandatory.
test('roster UNION exposes the explicitly named role column', () => {
  assert.match(permissions, /select m\.id,m\.user_id,case when l\.owner_user_id=m\.user_id then 'owner' else m\.role end as role,m\.joined_at/u);
  assert.match(permissions, /'role',x\.role/u);
});
