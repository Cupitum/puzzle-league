// Supabase Edge Function: caller JWT is validated via GoTrue before any privileged RPC.
// The project intentionally keeps the service role key strictly inside the Edge runtime.
import { parseShare, previewPerformance } from './parser.mjs';
import { evaluateEvidence } from './identity-evidence.mjs';
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
  let verifiedEmail:string|null=null;
  if(action!=='standings' || auth) {
    if(!/^Bearer\s+\S+$/iu.test(auth)) return json({error:'Authentication required'},401);
    try {
      const u=await fetch(`${url}/auth/v1/user`,{headers:{'apikey':secret,'authorization':auth}});
      if(!u.ok) return json({error:'Invalid session'},401);
      const subject=await u.json(); actor=subject.id;
      if(typeof subject.email==='string' && typeof subject.email_confirmed_at==='string' && subject.email_confirmed_at.length>0) verifiedEmail=subject.email;
      if(typeof actor!=='string'||!/^[-0-9a-f]{36}$/iu.test(actor)) return json({error:'Invalid identity'},401);
    } catch {return json({error:'Authentication service unavailable'},503);}
  }
  let data:Record<string,unknown>={...(body.data && typeof body.data==='object'&&!Array.isArray(body.data)
    ?body.data as Record<string,unknown>:{})};
  // P8 account proof: trusted caller identity only. No client-supplied actor or email.
  const emailActions=new Set(['email_verification_status','email_send_verification','email_confirm_verification']);
  if(emailActions.has(action)) {
    if(!actor || !verifiedEmail) return json({error:'Signed-in email account required'},401);
    const rpc=async (name:string,args:Record<string,unknown>)=>{
      return fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',
        headers:{apikey:secret,authorization:`Bearer ${secret}`,'content-type':'application/json'},
        body:JSON.stringify(args)});
    };
    if(action==='email_verification_status') {
      try {const res=await rpc('p8_email_status',{p_actor:actor});
        if(!res.ok)return json({error:'Verification status unavailable'},503);
        return json({ok:true,result:await res.json()});
      } catch{return json({error:'Verification status unavailable'},503);}
    }
    // A server-only HMAC protects short codes against offline DB guessing.
    const pepper=Deno.env.get('PUZZLE_VERIFY_HMAC_KEY');
    if(!pepper || pepper.length<32) return json({error:'Email verification not configured'},503);
    const makeHash=async (code:string)=>{
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),
        {name:'HMAC',hash:'SHA-256'},false,['sign']);
      const raw=new Uint8Array(await crypto.subtle.sign('HMAC',key,
        new TextEncoder().encode(`${actor}:${verifiedEmail.toLowerCase()}:${code}`)));
      return Array.from(raw).map(v=>v.toString(16).padStart(2,'0')).join('');
    };
    if(action==='email_confirm_verification') {
      if(typeof data.code!=='string'|| !/^[0-9]{8}$/u.test(data.code))
        return json({error:'Enter the eight-digit code from your email'},400);
      try {const digest=await makeHash(data.code);
        const res=await rpc('p8_email_confirm',{p_actor:actor,p_email:verifiedEmail,p_digest:digest});
        if(!res.ok)return json({error:'Verification currently unavailable'},503);
        const accepted=await res.json();
        if(accepted!==true)return json({error:'Incorrect, expired or exhausted verification code'},403);
        return json({ok:true,result:{verified:true}});
      } catch{return json({error:'Verification currently unavailable'},503);}
    }
    // Do not create a usable challenge when email delivery is not configured.
    const brevo=Deno.env.get('BREVO_API_KEY');
    const sender=Deno.env.get('PUZZLE_VERIFICATION_SENDER');
    if(!brevo || !sender || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(sender))
      return json({error:'Verification email delivery not configured'},503);
    // Secure uniform random 8-digit code; never include it in a response/log.
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
    const code=(bytes[0]%100000000).toString().padStart(8,'0');
    try {
      const digest=await makeHash(code);
      const begin=await rpc('p8_email_begin',{p_actor:actor,p_email:verifiedEmail,p_digest:digest});
      if(!begin.ok)return json({error:'Verification already sent or request limited; try again later'},429);
      const delivery=await fetch('https://api.brevo.com/v3/smtp/email',{
        method:'POST',headers:{'api-key':brevo,'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify({sender:{email:sender,name:'Puzzle League'},
          to:[{email:verifiedEmail}],subject:'Puzzle League: verify your email',
          htmlContent:`<p>Your Puzzle League verification code is <strong>${code}</strong>.</p><p>It expires in 15 minutes. If you did not request it, ignore this message.</p>`})});
      if(!delivery.ok)return json({error:'Email delivery failed; try again after the resend interval'},503);
      return json({ok:true,result:{sent:true,expires_in_minutes:15}});
    } catch{return json({error:'Verification service unavailable'},503);}
  }
  // Polishing RPCs are deliberately separate from the frozen competition dispatcher.
  const protectedPolish=new Set(['roster','set_permission','create_invitation',
    'revoke_invitation','manage_member','pending_evidence','deletion_status','request_deletion']);
  if(protectedPolish.has(action)) {
    if(!actor) return json({error:'Authentication required'},401);
    if(action==='request_deletion') {
      // Supabase Confirm Email=OFF implicitly confirms all accounts, so check
      // the separate operator-proof state before accepting account requests.
      try {const proof=await fetch(`${url}/rest/v1/rpc/p8_email_status`,{
        method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,'content-type':'application/json'},
        body:JSON.stringify({p_actor:actor})});
        if(!proof.ok || !(await proof.json())?.verified)
          return json({error:'Verify your email in Account first'},403);
      } catch{return json({error:'Email proof unavailable'},503);}

      // Fresh proof of the registered email/password, never stored or logged.
      if(!verifiedEmail || typeof data.current_password!=='string' ||
          data.current_password.length<6 || data.current_password.length>256)
        return json({error:'Verified email and current password required'},403);
      try {
        const check=await fetch(`${url}/auth/v1/token?grant_type=password`,{
          method:'POST',headers:{apikey:secret,'content-type':'application/json'},
          body:JSON.stringify({email:verifiedEmail,password:data.current_password})});
        if(!check.ok) return json({error:'Identity verification failed'},403);
        const fresh=await check.json();
        if(fresh?.user?.id!==actor) return json({error:'Identity verification failed'},403);
      } catch {return json({error:'Identity verification unavailable'},503);}
    }
    data={...data}; delete data.current_password;
    try {
      const res=await fetch(`${url}/rest/v1/rpc/p7_polishing`,{
        method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,
          'content-type':'application/json',accept:'application/json'},
        body:JSON.stringify({p_actor:actor,p_action:action,p_data:data})});
      if(!res.ok) return json({error:res.status===403?'Permission denied':
        'Protected request rejected',code:res.status},res.status===403?403:409);
      return json({ok:true,result:await res.json()});
    } catch {return json({error:'Protected service unavailable'},503);}
  }
  if(action==='pending_sources') {
    if(!actor || typeof data.league_id!=='string'||!/^[0-9a-f-]{36}$/iu.test(data.league_id))
      return json({error:'League required'},400);
    try {
      const res=await fetch(`${url}/rest/v1/rpc/p7_pending_sources`,{
        method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,
          'content-type':'application/json',accept:'application/json'},
        body:JSON.stringify({p_actor:actor,p_league:data.league_id})});
      if(!res.ok) return json({error:'Independent reviewer permission required'},403);
      return json({ok:true,result:await res.json()});
    } catch {return json({error:'Reviewer evidence unavailable'},503);}
  }
  if(action==='export_history_page') {
    if(!actor)return json({error:'Authentication required'},401);
    const offset=data.offset;
    const game=data.game;
    if(typeof offset!=='number'||!Number.isInteger(offset)||offset<0||offset>1000000||
      !(game===null || game===undefined || ['wordle','minute_cryptic','foximax','polygonle','krillion'].includes(String(game))))
      return json({error:'Invalid history page'},400);
    try {const res=await fetch(`${url}/rest/v1/rpc/p8_history_page`,{
      method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,'content-type':'application/json'},
      body:JSON.stringify({p_actor:actor,p_offset:offset,p_limit:100,p_game:game??null})});
      if(!res.ok)return json({error:'History export unavailable'},503);
      return json({ok:true,result:await res.json()});
    } catch {return json({error:'History export unavailable'},503);}
  }
  if(action==='daily_dashboard' || action==='native_history') {
    if(!actor) return json({error:'Authentication required'},401);
    try {
      const res=await fetch(`${url}/rest/v1/rpc/${action==='daily_dashboard'?'p6_daily_dashboard':'p6_native_history'}`,{
        method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,
          'content-type':'application/json',accept:'application/json'},
        body:JSON.stringify({p_actor:actor})});
      if(!res.ok) return json({error:'Personal dashboard unavailable',code:res.status},503);
      return json({ok:true,result:await res.json()});
    } catch {return json({error:'Personal dashboard unavailable'},503);}
  }
  let identityAudit:{decision:string;reason:string;source_kind:string|null;game:string|null;key:string|null}|null=null;
  if(action==='submit') {
    if(typeof data.raw_text!=='string'||data.raw_text.length>16000)return json({error:'Share text required (max 16 KB)'},400);
    if(!['paste','android_share'].includes(String(data.method))) return json({error:'Invalid submission method'},400);
    const p=parseShare(data.raw_text);
    if(p.status==='invalid' && p.game===null && p.raw_text.length>16000)return json({error:'Text too large'},413);
    // Independent source reference is created only by the database operator.
    // Fail closed: an outage, expired evidence or conflict NEVER certifies the share.
    let evidence:unknown=null;
    if(p.game && p.identity_key && ['recognized_valid','needs_review'].includes(p.status)) {
      try {
        const probe=await fetch(`${url}/rest/v1/rpc/p7_identity_reference`,{
          method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,
            'content-type':'application/json',accept:'application/json'},
          body:JSON.stringify({p_game:p.game,p_key:p.identity_key})});
        if(probe.ok) evidence=await probe.json();
      } catch { /* Source/read outage: preserve the pending review path. */ }
    }
    const resolved=evaluateEvidence(p,evidence);
    identityAudit={decision:resolved.verified?'reference_matched':'pending_unverified',
      reason:resolved.reason,source_kind:resolved.verified?resolved.source_kind:null,
      game:p.game,key:p.identity_key};
    // A needs_review format is only promoted after an independent source and
    // a specific per-game shape/mode/date contract succeed. The SQL dispatcher
    // still checks 48-hour window, duplicate, membership and season rules.
    data={raw_text:p.raw_text,game:p.game,
      status:resolved.verified?'recognized_valid':
        (p.status==='recognized_valid'?'needs_review':p.status),identity_key:p.identity_key,
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
    const result=await res.json();
    if(action==='submit' && identityAudit && result?.submission_id && !result.duplicate) {
      // Audit is separate from scoring. If unavailable, never claim it succeeded.
      try {
        await fetch(`${url}/rest/v1/rpc/p7_log_identity_decision`,{
          method:'POST',headers:{apikey:secret,authorization:`Bearer ${secret}`,
            'content-type':'application/json'},
          body:JSON.stringify({p_actor:actor,p_submission:result.submission_id,
            p_game:identityAudit.game,p_key:identityAudit.key,p_outcome:identityAudit.decision,
            p_reason:identityAudit.reason,p_source_kind:identityAudit.source_kind})});
      } catch { /* Submission receipt and immutable stored original remain authoritative. */ }
    }
    return json({ok:true,result});
  } catch {return json({error:'Competition service unavailable'},503);}
});
