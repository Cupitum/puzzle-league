/** Strictly non-mutating hosted origin, service worker and Edge Auth-denial probe. */
import { validateProductionEnv } from './release-config.mjs';
const fail = (msg) => { throw new Error(msg); };
const checkSite = (value) => {
  let u;
  try { u = new URL(value); } catch { fail('RELEASE_SITE_URL is invalid'); }
  if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash || u.username || u.password)
    fail('RELEASE_SITE_URL must be a clean HTTPS origin');
  return u.origin;
};
const timeoutMs = 14000;
async function get(url, init={}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow', cache: 'no-store' });
  if (!response.ok) fail(`Unexpected HTTP ${response.status} at ${new URL(url).pathname}`);
  return response;
}
try {
  const cfg = validateProductionEnv(process.env);
  const site = checkSite(process.env.RELEASE_SITE_URL);
  const root = await get(site + '/');
  if (!(await root.text()).includes('id="root"')) fail('Site did not serve the React HTML');
  if (root.headers.get('x-content-type-options') !== 'nosniff') fail('Missing nosniff on site HTML');
  const csp = root.headers.get('content-security-policy') ?? '';
  if (!csp.includes(`connect-src 'self' ${cfg.apiOrigin}`) || !csp.includes("object-src 'none'"))
    fail('Missing project-specific production Content Security Policy');
  const man = await get(site + '/manifest.webmanifest');
  const manifest = await man.json();
  if (manifest.share_target?.action !== '/share-target' || manifest.share_target?.method !== 'POST' ||
      manifest.share_target?.enctype !== 'multipart/form-data') fail('Hosted Share Target manifest differs');
  const sw = await get(site + '/sw.js');
  const worker = await sw.text();
  if (!worker.includes("'/share-target'") || !worker.includes('request.formData()'))
    fail('Hosted service worker lacks POST Share Target intake');
  const options = await get(cfg.apiOrigin + '/functions/v1/competition', {
    method: 'OPTIONS', headers: { origin: site, 'access-control-request-method': 'POST',
      'access-control-request-headers': 'apikey,authorization,content-type' }
  });
  if (!String(options.headers.get('access-control-allow-headers')).toLowerCase().includes('authorization'))
    fail('Edge function CORS preflight denies authorization');
  // No token, no valid actor, no mutation. A missing Edge function or misconfiguration must NOT pass.
  const denied = await fetch(cfg.apiOrigin + '/functions/v1/competition', {
    method:'POST', headers: {apikey: cfg.publicKey, 'content-type':'application/json', origin:site},
    body: JSON.stringify({action:'my_leagues',data:{}}), signal:AbortSignal.timeout(timeoutMs), cache:'no-store'
  });
  const body = await denied.json().catch(() => ({}));
  if (denied.status !== 401 || body.error !== 'Authentication required')
    fail(`Unauthenticated Edge denial incorrect (HTTP ${denied.status})`);
  console.log('PHASE 6 HOSTED READ-ONLY SMOKE: PASS (HTTPS/PWA/Edge auth-denial)');
  console.log('NOT TESTED: browser installation, Android Share, signed-in RLS, backup restore or pilot');
} catch (err) {
  console.error('PHASE 6 HOSTED READ-ONLY SMOKE: FAIL:', err.message);
  process.exitCode = 1;
}
