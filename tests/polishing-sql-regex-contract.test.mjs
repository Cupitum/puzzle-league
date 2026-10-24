import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('../supabase/migrations/20261023100200_polishing_identity_evidence.sql',import.meta.url),'utf8');
const fixture=readFileSync(new URL('../supabase/tests/polishing_identity_reference_real_sql_gate.sql',import.meta.url),'utf8');
const live=readFileSync(new URL('../scripts/polishing/local_live_auth_edge.mjs',import.meta.url),'utf8');
const shell=readFileSync(new URL('../scripts/polishing/local_live_auth_edge_gate.sh',import.meta.url),'utf8');

test('SQLSTATE 2201B regression: no PostgreSQL regex bound over 255',()=>{
 assert.doesNotMatch(migration,/\{4,500\}/u);
 const bounds=[...migration.matchAll(/\{(\d+)(?:,(\d*))?\}/gu)];
 for (const [,lo,hi] of bounds) {
   assert.ok(Number(lo)<=255,`Lower bound exceeds PostgreSQL limit: ${lo}`);
   if(hi) assert.ok(Number(hi)<=255,`Upper bound exceeds PostgreSQL limit: ${hi}`);
 }
});
test('operator and table enforce HTTPS, reject whitespace, and preserve old 4..500 character tail limit',()=>{
 assert.equal((migration.match(/\^https:\/\/\[\^\[:space:\]\]\{4,\}\$/gu)??[]).length,2);
 assert.match(migration,/char_length\(source_url\) between 12 and 508/u);
 assert.match(migration,/char_length\(p_source_url\) not between 12 and 508/u);
 assert.match(migration,/p_source_url is null/u);
});
test('transactional real PostgreSQL gate checks long/short/non-HTTPS/whitespace, awards unchanged',()=>{
 assert.match(fixture,/^BEGIN;/mu);
 assert.match(fixture,/ROLLBACK;/mu);
 assert.match(fixture,/p7_register_daily_reference/u);
 assert.match(fixture,/p7_identity_reference/u);
 assert.match(fixture,/league_score_entries/u);
 assert.match(fixture,/repeat\('a',500\)/u);
 assert.match(fixture,/repeat\('a',501\)/u);
 assert.match(fixture,/chr\(10\)/u);
 assert.match(fixture,/SQLSTATE '22023'/u);
 assert.doesNotMatch(fixture,/service_role|\bTRUNCATE\b|\bDELETE FROM\b/iu);
});
test('real-local gate actually executes the SQL fixture against disposable postgres',()=>{
 assert.match(live,/gateStage='identity_sql_url_contract'/u);
 assert.match(live,/polishing_identity_reference_real_sql_gate\.sql/u);
 assert.match(live,/ON_ERROR_STOP=1/u);
 assert.match(live,/gateStage='identity_operator_registration'/u);
});
test('Bash failure output exposes only bounded failure codes and stage',()=>{
 assert.match(shell,/FAILURE_GATE_STAGE\|FAILURE_SQLSTATE\|FAILURE_HTTP_STATUS/u);
 assert.doesNotMatch(shell,/cat\s+"\$WORK\/integration\.private\.log"/u);
});
