#!/usr/bin/env node
/* Read-only reconciliation of the 3 remaining non-Polygonle pending submissions.
   No network requests; evidence URLs are human-verifiable citations, not API proof. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessRemainingRow } from './remaining-evidence-core.mjs';

const REPO=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const EXPECTED_COMMIT='2f01d63';
const PARSER_SHA='01a49b51301cd8322de2a79d690b08dcf1a041e1790462ab98b04e43a822a7e4';
const games=['wordle','minute_cryptic','foximax'];
const watchTables=[
 'public.result_submissions','public.game_puzzles','public.league_score_entries',
 'app_private.approval_requests','app_private.approval_decisions',
 'app_private.p6_pending_reparse_events','app_private.competition_events',
 'public.league_seasons','public.season_game_settings'
];
export const FINGERPRINT_SQL=`BEGIN TRANSACTION READ ONLY;\nSELECT jsonb_object_agg(t.name,t.fingerprint) FROM (\n${watchTables.map(name =>
  `SELECT '${name}' AS name,(SELECT md5(COALESCE(string_agg(md5(to_jsonb(x)::text),'|' ORDER BY md5(to_jsonb(x)::text)),'')) FROM ${name} x) AS fingerprint`
).join('\nUNION ALL\n')}\n) t;\nCOMMIT;`;
const READ_SQL=`BEGIN TRANSACTION READ ONLY;\nSET LOCAL statement_timeout='30s';
SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.submitted_at,t.id),'[]'::jsonb) FROM (
 SELECT s.id,s.game_id,s.raw_share_text,s.parser_version,s.parse_status,s.parsed_fields,
        s.review_status,s.submitted_at,p.identity_key,p.puzzle_day,p.mode,p.verification_state,
        (SELECT count(*) FROM app_private.approval_requests r WHERE r.submission_id=s.id) review_count,
        (SELECT count(*) FROM app_private.approval_decisions d JOIN app_private.approval_requests r ON r.id=d.request_id WHERE r.submission_id=s.id) decision_count,
        (SELECT count(*) FROM public.league_score_entries e WHERE e.submission_id=s.id) award_count
 FROM public.result_submissions s LEFT JOIN public.game_puzzles p ON p.id=s.puzzle_id
 WHERE s.review_status='pending' AND s.game_id IN ('wordle','minute_cryptic','foximax')
 ORDER BY s.submitted_at,s.id
) t;\nCOMMIT;`;
function run(args,input) {
 const p=spawnSync(args[0],args.slice(1),{input,encoding:'utf8',maxBuffer:16*1024*1024});
 if(p.error || p.status!==0)throw Error(`${args[0]} failed. Check local runtime without sharing secrets.`);
 return p.stdout.trim();
}
function query(db,sql) {
 const out=run(['docker','exec','-i',db,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],sql);
 const lines=out.split('\n').filter(x=>x.trim().startsWith('[')||x.trim().startsWith('{'));
 if(lines.length!==1)throw Error('Unexpected database response');
 return JSON.parse(lines[0]);
}
function sha(buf){return createHash('sha256').update(buf).digest('hex');}
function main() {
 if(process.argv.length!==3 || process.argv[2]!=='--read-only')throw Error('Usage: node scripts/phase6/remaining-results.mjs --read-only');
 const ancestry=spawnSync('git',['-C',REPO,'merge-base','--is-ancestor',EXPECTED_COMMIT,'HEAD'],{encoding:'utf8'});
 if(ancestry.status!==0)throw Error('Git HEAD must descend from '+EXPECTED_COMMIT);
 if(run(['git','-C',REPO,'status','--porcelain','--untracked-files=no']))throw Error('Tracked source changes detected; review before running');
 const parserSha=run(['sha256sum',resolve(REPO,'supabase/functions/competition/parser.mjs')]).split(' ')[0];
 if(parserSha!==PARSER_SHA)throw Error('Audited parser source differs');
 const dbs=run(['docker','ps','--filter','name=supabase_db','--format','{{.Names}}']).split('\n').filter(Boolean);
 if(dbs.length!==1 || !dbs[0].startsWith('supabase_db_Puzzle_League_'))throw Error('Expected one local Puzzle League database');
 const db=dbs[0];
 const versions=query(db,`BEGIN TRANSACTION READ ONLY;SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations;COMMIT;`);
 if(versions.length!==13 || !versions.includes('20261018100000') || !versions.includes('20261018150000'))throw Error('Expected exactly 13 migrations, including Phase 6 audit/recovery');
 const before=query(db,FINGERPRINT_SQL);
 const rows=query(db,READ_SQL);
 if(rows.length!==3 || !games.every(g=>rows.filter(r=>r.game_id===g).length===1))throw Error('Expected one pending row for each of Wordle, Minute Cryptic, FoxiMax; no mutations attempted');
 const cases=rows.map((r,i)=>{
   const a=assessRemainingRow(r);
   if(a.decision!=='RETAIN_PENDING_NO_AWARD')throw Error('Unexpected proposed decision');
   return {record:i+1, submission_id:r.id,submitted_at:r.submitted_at,
    original_share_sha256:sha(r.raw_share_text),stored_parser_version:r.parser_version,
    stored_puzzle_identity:r.identity_key,stored_puzzle_day:r.puzzle_day,
    stored_mode:r.mode,stored_identity_verification_state:r.verification_state,
    ...a};
 });
 const after=query(db,FINGERPRINT_SQL);
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Monitored application fingerprints changed during read-only run');
 const root=process.env.PL_RECONCILE_OUT;
 if(!root||!root.startsWith('/')||resolve(root).startsWith(REPO+'/'))throw Error('Set private absolute PL_RECONCILE_OUT outside repository');
 mkdirSync(root,{recursive:true,mode:0o700});chmodSync(root,0o700);
 const stamp=new Date().toISOString();
 const path=resolve(root,'remaining_three_private_evidence.json');
 writeFileSync(path,JSON.stringify({generated_at:stamp,source_commit:EXPECTED_COMMIT,
  database_migrations:versions.length,monitored_table_fingerprints:before,
  external_research_not_authentication:true,automatically_awarded:0,cases},null,2)+'\n',{mode:0o600});chmodSync(path,0o600);
 console.log('PASS: 3 non-Polygonle pending cases assessed; all remain BLOCKED from automatic acceptance.');
 for(const c of cases)console.log(`CASE ${c.record}: ${c.game} ${c.number_or_key}; external=${c.evidence_level}; publisher_clue_match=${c.publisher_clue_match}; issues=${c.issues.length}; awards=${c.awards}`);
 console.log('PASS: nine monitored application table fingerprints unchanged; read-only database transactions only.');
 console.log('NO database writes; no award, review, puzzle day, mode or eligibility approved.');
 console.log('Private evidence report:',path);
}
try{main();}catch(e){console.error('STOP:',e.message);process.exitCode=1;}
