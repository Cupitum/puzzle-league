// Supabase Edge Function: caller JWT is validated via GoTrue before any privileged RPC.
// The project intentionally keeps the service role key strictly inside the Edge runtime.
import { parseShare, previewPerformance } from './parser.mjs';
const json = (obj:unknown,status=200) => new Response(JSON.stringify(obj), {
  status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type',
    'access-control-allow-methods':'POST, OPTIONS'}
});
Deno.serve(async req => {
  if(req.method==='OPTIONS') return json({ok:true});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const url=Deno.env.get('SUPABASE_URL')?.replace(/\/$/u,'');
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!secret) return json({error:'Backend not configured'},503);
  let body:Record<string,unknown>;
  try {
    if(Number(req.headers.get('content-length')??0)>20000) return json({error:'Request too large'},413);
    body=await req.json();
    if(!body || typeof body!=='object'||Array.isArray(body)) return json({error:'Invalid request'},400);
  } catch {return json({error:'Invalid JSON'},400);}
  const action=body.action;
  if(typeof action!=='string'||action.length>80)return json({error:'Invalid action'},400);
  // Anonymous access is deliberately limited to PUBLIC standings only.
  const auth=req.headers.get('authorization')??'';
  let actor:string|null=null;
  if(action!=='standings' || auth) {
    if(!/^Bearer\s+\S+$/iu.test(auth)) return json({error:'Authentication required'},401);
    try {
      const u=await fetch(`${url}/auth/v1/user`,{headers:{'apikey':secret,'authorization':auth}});
      if(!u.ok) return json({error:'Invalid session'},401);
      const subject=await u.json(); actor=subject.id;
      if(typeof actor!=='string'||!/^[-0-9a-f]{36}$/iu.test(actor)) return json({error:'Invalid identity'},401);
    } catch {return json({error:'Authentication service unavailable'},503);}
  }
  let data:Record<string,unknown>={...(body.data && typeof body.data==='object'&&!Array.isArray(body.data)
    ?body.data as Record<string,unknown>:{})};
  if(action==='submit') {
    if(typeof data.raw_text!=='string'||data.raw_text.length>16000)return json({error:'Share text required (max 16 KB)'},400);
    if(!['paste','android_share','historical_import'].includes(String(data.method))) return json({error:'Invalid submission method'},400);
    const p=parseShare(data.raw_text);
    if(p.status==='invalid' && p.game===null && p.raw_text.length>16000)return json({error:'Text too large'},413);
    data={raw_text:p.raw_text,game:p.game,status:p.status,identity_key:p.identity_key,
      fields:p.fields,parser_version:p.parser_version,method:data.method};
  } else if(action==='request_correction') {
    if(typeof data.replacement_raw_text!=='string'||data.replacement_raw_text.length>16000)
      return json({error:'Replacement share required'},400);
    const p=parseShare(data.replacement_raw_text);
    if(!['recognized_valid','needs_review'].includes(p.status)||previewPerformance(p)===null)
      return json({error:'Replacement cannot be interpreted under approved rules'},400);
    data={submission_id:data.submission_id,league_id:data.league_id,rationale:data.rationale,
      replacement_raw_text:p.raw_text,game:p.game,identity_key:p.identity_key,status:p.status,
      parser_version:p.parser_version,fields:p.fields};
  }
  // Explicit action allowlist prevents accidental exposure of new database privileges.
  const allow=new Set(['update_profile','my_leagues','season_list','review_queue',
    'create_league','start_season','schedule_games','invite','invite_revoke','join','leave',
    'remove_member','suspend_member','unsuspend_member','report','report_queue','resolve_report',
    'delegate_review','submit','request_historical','request_correction','review','tick',
    'standings','my_history']);
  if(!allow.has(action))return json({error:'Unknown action'},400);
  try {
    const res=await fetch(`${url}/rest/v1/rpc/p4_dispatch`,{
      method:'POST',headers:{'apikey':secret,'authorization':`Bearer ${secret}`,
        'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({p_actor:actor,p_action:action,p_data:data})
    });
    if(!res.ok) {
      // Avoid leaking raw database details, SQL source, identifiers or secret values.
      return json({error:res.status===409?'Duplicate or conflict':
        res.status===403||res.status===401?'Permission denied':'Competition request rejected',
        code:res.status},res.status===401||res.status===403?403:409);
    }
    return json({ok:true,result:await res.json()});
  } catch {return json({error:'Competition service unavailable'},503);}
});
