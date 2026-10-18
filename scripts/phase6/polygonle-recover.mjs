#!/usr/bin/env node
/*
 * Source-pinned, private report and transaction-guarded Polygonle #1539 recovery.
 * No real row writes during --plan. --apply is explicit and never accepts guessed dates.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseShare, previewPerformance } from '../../supabase/functions/competition/parser.mjs';

const COMMIT = '4f96c44';
const PARSER_HASH = '01a49b51301cd8322de2a79d690b08dcf1a041e1790462ab98b04e43a822a7e4';
const M12 = '20261018100000';
const M13 = '20261018150000';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(SCRIPT_DIR, '../..');
const QUERY = `BEGIN READ ONLY;
select coalesce(jsonb_agg(to_jsonb(t) order by t.submitted_at,t.id),'[]'::jsonb) from (
 select s.id,s.game_id,s.puzzle_id,s.raw_share_text,s.parser_version,s.parse_status,
        s.parsed_fields,s.review_status,s.submitted_at,
        (select count(*) from app_private.approval_requests r where r.submission_id=s.id) review_count,
        (select count(*) from app_private.approval_decisions d
           join app_private.approval_requests r on r.id=d.request_id
           where r.submission_id=s.id) decision_count,
        (select count(*) from public.league_score_entries e where e.submission_id=s.id) award_count,
        (select count(*) from app_private.p6_pending_reparse_events e where e.submission_id=s.id) reparse_count,
        (select jsonb_agg(jsonb_build_object('before_parser',e.before_parser,'before_status',e.before_status,
          'before_fields',e.before_fields,'after_parser',e.after_parser,'after_status',e.after_status,
          'after_fields',e.after_fields,'raw_sha256',e.raw_sha256)) from app_private.p6_pending_reparse_events e
          where e.submission_id=s.id) audit_events
 from public.result_submissions s where s.review_status='pending' and s.game_id='polygonle'
 order by s.submitted_at,s.id
) t;
COMMIT;`;

export function assessRow(r) {
  const p = parseShare(r.raw_share_text);
  const problems=[];
  if(r.game_id!=='polygonle' || r.review_status!=='pending' || r.parse_status!=='ambiguous') problems.push('not_pending_ambiguous_polygonle');
  if(r.puzzle_id!==null) problems.push('linked_puzzle_requires_original_guard');
  if(r.review_count!==1 || Number(r.decision_count)!==0 || Number(r.award_count)!==0 || Number(r.reparse_count)!==0) problems.push('history_or_review_mismatch');
  if(!r.parser_version || !r.parser_version.startsWith('p4-')) problems.push('unexpected_old_parser');
  if(p.game!=='polygonle' || p.status!=='needs_review' || p.identity_key!=='1539' || p.parser_version!=='p4-1.0.0') problems.push('unsupported_parser_interpretation');
  if(p.fields?.puzzle_number!==1539 || p.fields?.puzzle_date!==null || p.fields?.attempt_limit_displayed!==6 || ![6,7,8].includes(p.fields?.word_length_observed)) problems.push('unsupported_mode_or_identity_fields');
  if(!p.issues.includes('mode_unverified') || !p.issues.includes('puzzle_date_not_verified') || previewPerformance(p)===null) problems.push('missing_uncertainty_or_approved_preview');
  return {problems,p,sha:createHash('sha256').update(r.raw_share_text).digest('hex')};
}

function run(args,input) {
  const p=spawnSync(args[0],args.slice(1),{input,encoding:'utf8',maxBuffer:16*1024*1024});
  if(p.error || p.status!==0) throw Error(`${args[0]} failed (${p.status??'no exit status'}); verify local environment without sharing secrets`);
  return p.stdout.trim();
}
function sha(buf){return createHash('sha256').update(buf).digest('hex')}
function quote(s){if(typeof s!=='string' || s.includes('\0'))throw Error('Invalid SQL value');return `'${s.replaceAll("'","''")}'`;}
function postgres(target,input) {return run(['docker','exec','-i',target,'psql','-X','-q','-A','-t','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input)}
function main(){
 const argv=process.argv.slice(2);
 const isApply=argv.includes('--apply');
 const isVerify=argv.length===1 && argv[0]==='--verify';
 if(!(isApply?argv.length===3 && argv.includes('--confirm') && argv.includes('POLYGONLE-1539-PARSER-ONLY'):(argv.length===1 && (argv[0]==='--plan' || argv[0]==='--verify')))) {
   throw Error('Usage: --plan OR --apply --confirm POLYGONLE-1539-PARSER-ONLY OR --verify');
 }
 const head=run(['git','-C',REPO,'rev-parse','--short','HEAD']);
 if(head!==COMMIT) throw Error('Git source anchor changed');
 const parserFile=readFileSync(resolve(REPO,'supabase/functions/competition/parser.mjs'));
 if(sha(parserFile)!==PARSER_HASH) throw Error('Parser source differs from pinned audited version');
 const containers=run(['docker','ps','--filter','name=supabase_db','--format','{{.Names}}']).split('\n').filter(Boolean);
 if(containers.length!==1 || !containers[0].startsWith('supabase_db_Puzzle_League_')) throw Error('Expected unique local Puzzle League DB');
 const db=containers[0];
 const versions=postgres(db,`BEGIN READ ONLY;SELECT string_agg(version,',' ORDER BY version) FROM supabase_migrations.schema_migrations;COMMIT;`).split(',');
 if(versions.length!==(isApply||isVerify?13:12) || !versions.includes(M12) || ((isApply||isVerify) && !versions.includes(M13))) throw Error('Expected local migration history: 12 for plan / 13 for apply and verify');
 const rows=JSON.parse(postgres(db,QUERY).split('\n').find(x=>x.trim().startsWith('[')) ?? 'null');
 if(!Array.isArray(rows) || rows.length!==3)throw Error('Expected exactly three pending Polygonle rows');
 const inspected=rows.map(r=>({row:r,...assessRow({...r,review_count:Number(r.review_count)})}));
 if(!isVerify){
   const bad=inspected.map((x,i)=>({record:i+1,issues:x.problems})).filter(x=>x.issues.length);
   if(bad.length)throw Error('Fail-closed: candidate checks failed: '+JSON.stringify(bad));
 }
 const output=process.env.PL_RECONCILE_OUT;
 if(!output || !output.startsWith('/') || resolve(output).startsWith(REPO+'/'))throw Error('Set PL_RECONCILE_OUT to absolute private path outside repository');
 mkdirSync(output,{recursive:true,mode:0o700});chmodSync(output,0o700);
 const evidence={source_commit:COMMIT,parser_sha256:PARSER_HASH,verification:'Parser only. Identity/date/mode are unverified; no awards.',
  candidates:inspected.map(({row,p,sha:raw_sha256})=>({id:row.id,previous_parser:row.parser_version,previous_status:row.parse_status,
   previous_fields:row.parsed_fields,raw_sha256,new_parser:p.parser_version,new_status:p.status,
   new_fields:p.fields,proposed_identity_key:p.identity_key,puzzle_id:row.puzzle_id,review_request_count:Number(row.review_count)}))};
 const planFile=resolve(output,'polygonle_1539_private_plan.json');
 const contents=JSON.stringify(evidence,null,2)+'\n';
 if(isVerify){
   const before=JSON.parse(readFileSync(planFile,'utf8'));
   if(before.source_commit!==COMMIT || before.parser_sha256!==PARSER_HASH || before.candidates?.length!==3)throw Error('Private plan missing or invalid');
   for(const r of rows){
     const prior=before.candidates.find(c=>c.id===r.id);
     const p=parseShare(r.raw_share_text);
     const audit=r.audit_events?.[0];
     if(!prior || r.review_status!=='pending' || r.parse_status!=='needs_review' || r.puzzle_id!==null || r.review_count!==1 ||
        Number(r.decision_count)!==0 || Number(r.award_count)!==0 || Number(r.reparse_count)!==1 ||
        r.parser_version!==p.parser_version || !isDeepStrictEqual(r.parsed_fields,p.fields) ||
        sha(Buffer.from(r.raw_share_text))!==prior.raw_sha256 || !audit ||
        audit.before_parser!==prior.previous_parser || audit.before_status!==prior.previous_status ||
        !isDeepStrictEqual(audit.before_fields,prior.previous_fields) ||
        audit.after_parser!==p.parser_version || audit.after_status!=='needs_review' ||
        !isDeepStrictEqual(audit.after_fields,p.fields) || audit.raw_sha256!==prior.raw_sha256)
          throw Error('Post-apply verification failed; investigate without retrying writes');
   }
   console.log('PASS: 3 recovery events match source-parsed fields, original shares and pre-change plan.');
   console.log('PASS: all 3 remain pending, unlinked, unawarded, with original review requests.');
   return;
 }
 if(!isApply){writeFileSync(planFile,contents,{mode:0o600});chmodSync(planFile,0o600);
   console.log('PASS: read-only plan for 3 Polygonle #1539 parser recoveries; no DB changes.');
   console.log('PASS: three unlinked, pending and unawarded rows, with 1 outstanding review request each.');
   console.log('UNVERIFIED: official mode/date; no puzzle links or awards planned. PRIVATE plan:',planFile);return;}
 if(!process.env.PL_OPERATOR_LABEL || process.env.PL_OPERATOR_LABEL.trim().length<3)throw Error('Set PL_OPERATOR_LABEL (non-sensitive operational label, >=3 chars)');
 if(!process.env.PL_BACKUP_RESTORE_PASS || process.env.PL_BACKUP_RESTORE_PASS!=='YES')throw Error('Recent verified backup/restore evidence required: PL_BACKUP_RESTORE_PASS=YES');
 if(!readFileSync(planFile,'utf8').endsWith('\n'))throw Error('Plan damaged');
 const previous=JSON.parse(readFileSync(planFile,'utf8'));
 if(JSON.stringify(previous)!==JSON.stringify(evidence))throw Error('Saved private plan changed or source DB drifted; rerun --plan before apply');
 const operator=process.env.PL_OPERATOR_LABEL.trim();
 if(operator.length>120)throw Error('Operator label too long');
 const batches=inspected.map(({row,p,sha:rawSha})=>({id:row.id,hash:rawSha,prior_parser:row.parser_version,
  prior_fields:row.parsed_fields,new_parser:p.parser_version,new_fields:p.fields}));
 const payload=quote(JSON.stringify(batches));
 const op=quote(operator);
 const reason=quote('Recovery of previously ambiguous Polygonle #1539 share under source commit 4f96c44. Pattern and grid independently parsed from immutable raw text. Mode and official puzzle date remain unverified. No awards or approval.');
 const uri=quote('local://puzzle-league/phase6/polygonle-1539/4f96c44');
 const sql=`BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';
 LOCK TABLE public.league_score_entries,app_private.approval_requests,app_private.approval_decisions IN SHARE MODE;
 DO $batch$ DECLARE r record; v_id bigint; n integer:=0;
 BEGIN
   FOR r IN SELECT * FROM jsonb_to_recordset(${payload}::jsonb) AS a
   (id uuid,hash text,prior_parser text,prior_fields jsonb,new_parser text,new_fields jsonb)
   LOOP
     v_id:=app_private.p6_reparse_unlinked_polygonle(r.id,r.hash,r.prior_parser,r.prior_fields,
             r.new_parser,r.new_fields,${op},${reason},${uri});
     IF v_id IS NULL THEN RAISE EXCEPTION 'Missing audit event'; END IF;
     n:=n+1;
   END LOOP;
   IF n<>3 THEN RAISE EXCEPTION 'Expected exactly three corrections'; END IF;
   IF (SELECT count(*) FROM public.result_submissions
       WHERE game_id='polygonle' and review_status='pending' and parse_status='needs_review'
         and puzzle_id is null and parsed_fields->>'puzzle_number'='1539')<>3 THEN
     RAISE EXCEPTION 'Unexpected results after parser-only update'; END IF;
   IF (SELECT count(*) FROM app_private.p6_pending_reparse_events
        WHERE submission_id IN (SELECT id FROM jsonb_to_recordset(${payload}::jsonb) AS a(id uuid)))<>3 THEN
     RAISE EXCEPTION 'Expected exactly three audit events'; END IF;
   IF EXISTS (SELECT 1 FROM public.league_score_entries e
        JOIN jsonb_to_recordset(${payload}::jsonb) AS a(id uuid) ON a.id=e.submission_id) THEN
     RAISE EXCEPTION 'Award generated unexpectedly'; END IF;
   RAISE NOTICE 'PASS: exactly 3 pending parser interpretations and 3 immutable audit events';
 END $batch$;
 COMMIT;`;
 postgres(db,sql);
 console.log('PASS: committed 3 audited parser-only Polygonle #1539 recoveries.');
 console.log('CONFIRMED: no puzzle link/date/mode verification; existing review requests remain pending, no awards created by this operation.');
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{main();}catch(e){console.error('STOP:',e.message);process.exitCode=1;}
}
