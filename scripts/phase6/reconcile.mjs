// Read-only DB-to-parser assessment. Run only on local DB with psql available.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {parseShare,previewPerformance} from '../../supabase/functions/competition/parser.mjs';
if(!process.argv.includes('--read-only')) throw Error('Explicit --read-only required');
const dir=process.env.PL_RECONCILE_OUT;
if(!dir||!dir.startsWith('/')) throw Error('Set PL_RECONCILE_OUT to an absolute PRIVATE path outside Git');
const host=process.env.PGHOST??'127.0.0.1';
const port=process.env.PGPORT??'54322';
const user=process.env.PGUSER??'postgres';
const database=process.env.PGDATABASE??'postgres';
const sql=`begin transaction read only;
select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
 select s.id,s.game_id,s.parser_version,s.parse_status,s.parsed_fields,s.review_status,
 s.raw_share_text,p.mode,p.identity_key,p.puzzle_day,p.verification_state,
 (select count(*) from app_private.approval_requests r where r.submission_id=s.id) as review_count,
 (select count(*) from app_private.approval_decisions d join app_private.approval_requests r on r.id=d.request_id where r.submission_id=s.id) as decision_count,
 (select count(*) from public.league_score_entries e where e.submission_id=s.id) as award_count
 from public.result_submissions s left join public.game_puzzles p on p.id=s.puzzle_id
 where s.review_status='pending' order by s.submitted_at,s.id) t;
commit;`;
// Never print credentials or the private raw text; psql pulls credentials from existing pgpass/PGPASSWORD.
const containers=spawnSync('docker',[
  'ps','--filter','name=supabase_db','--format','{{.Names}}'
],{encoding:'utf8'});

if(containers.status!==0) throw Error('Docker unavailable');

const names=containers.stdout.trim().split('\\n').filter(Boolean);
if(names.length!==1) throw Error('Expected exactly one running Supabase DB container');

const run=spawnSync('docker',[
  'exec','-i',names[0],
  'psql','-X','-q','-A','-t',
  '-v','ON_ERROR_STOP=1',
  '-U','postgres','-d','postgres'
],{input:sql,encoding:'utf8',maxBuffer:16*1024*1024});
if(run.status!==0) {console.error('Read-only database query failed. Check local psql credentials and DB availability.');process.exit(1)}
const lines=run.stdout.split('\n').filter(x=>x.trim().startsWith('['));
if(lines.length!==1) throw Error('Unexpected DB response');
const rows=JSON.parse(lines[0]);
const report=rows.map(x=>{
 const p=parseShare(x.raw_share_text), score=previewPerformance(p);
 const raw_sha256=createHash('sha256').update(x.raw_share_text).digest('hex');
 const sourceMatch=x.game_id===p.game && x.identity_key===p.identity_key;
 const safeCandidate=x.review_status==='pending' && x.award_count===0 && x.decision_count===0 &&
 sourceMatch && p.status==='needs_review' && score!==null;
 const issues=[...p.issues];
 if(!sourceMatch)issues.push('stored_identity_mismatch');
 if(x.mode!=='daily'||x.verification_state!=='verified'||!x.puzzle_day)issues.push('official_identity_unverified');
 if(x.decision_count)issues.push('existing_review_decision');
 if(x.award_count)issues.push('existing_award');
 return {submission_id:x.id,game:x.game_id,stored_status:x.parse_status,
   proposed_status:p.status,old_parser:x.parser_version,new_parser:p.parser_version,
   raw_sha256,identity_key:p.identity_key,stored_identity_key:x.identity_key,
   puzzle_day:x.puzzle_day??null,verified_daily:x.mode==='daily'&&x.verification_state==='verified'&&!!x.puzzle_day,
   review_requests:Number(x.review_count),decisions:Number(x.decision_count),awards:Number(x.award_count),
   safe_candidate_for_human_review:safeCandidate,issues,
   proposed_fields:safeCandidate?p.fields:null,performance_preview_only:score,
   awarded_by_this_script:false};
});
mkdirSync(dir,{recursive:true,mode:0o700});
const path=`${dir}/pending_reconciliation.json`;
writeFileSync(path,JSON.stringify({generated_at:new Date().toISOString(),count:report.length,records:report},null,2),{mode:0o600});chmodSync(path,0o600);
console.log(`READ-ONLY: ${report.length} pending submissions; ${report.filter(x=>x.game==='polygonle').length} Polygonle; ${report.filter(x=>x.safe_candidate_for_human_review).length} possible parser-only review candidates.`);
console.log('No updates, approvals, identities, awards or reviews changed. PRIVATE report:',path);
