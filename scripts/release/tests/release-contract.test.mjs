import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validateProductionEnv, productionCsp } from '../release-config.mjs';
const root = resolve(import.meta.dirname, '../../..');
const file = (s) => readFileSync(join(root,s),'utf8');
const base = {
  VITE_APP_STAGE:'production',
  VITE_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz'
};
test('valid managed HTTPS public config passes with no secret printed', () => {
  const c = validateProductionEnv(base);
  assert.equal(c.apiOrigin, base.VITE_SUPABASE_URL);
});
for (const [name, change] of [
  ['missing stage',{VITE_APP_STAGE:''}],
  ['test stage',{VITE_APP_STAGE:'test'}],
  ['local HTTP',{VITE_SUPABASE_URL:'http://127.0.0.1:54321'}],
  ['private HTTP',{VITE_SUPABASE_URL:'http://192.168.8.57:54321'}],
  ['URL with path',{VITE_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co/rest/v1'}],
  ['URL with password',{VITE_SUPABASE_URL:'https://user:pass@example.com/'}],
  ['service key',{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_1234567890123456'}],
  ['legacy anon key',{VITE_SUPABASE_PUBLISHABLE_KEY:'eyJhbGciOiJIUzI1NiJ9'}],
  ['unexpected VITE key',{VITE_SERVICE_ROLE_KEY:'test'}],
]) test(`production gate rejects ${name}`, () => {
  assert.throws(() => validateProductionEnv({...base,...change}),/Release configuration invalid/u);
});
test('no changes to the thirteen immutable migrations', () => {
  const rows = readdirSync(join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql'));
  assert.equal(rows.length,13);
  assert.ok(rows.includes('20261018150000_phase6_unlinked_polygonle_recovery.sql'));
});
test('static headers protect SW, HTML and app shell', () => {
  const h=file('public/_headers');
  assert.match(h,/X-Content-Type-Options:\s*nosniff/u);
  assert.match(h,/\/sw\.js\s*\n\s*Cache-Control:/u);
  assert.match(h,/X-Frame-Options:\s*DENY/u);
});
test('SPA route fallback does not add POST network proxy', () => {
  assert.match(file('public/_redirects'),/\/\*\s+\/index\.html\s+200/u);
  assert.doesNotMatch(file('public/_redirects'),/https?:\/\//u);
});
test('source service worker preserves POST Share Target and raw text privacy', () => {
  const sw=file('public/sw.js');
  assert.match(sw,/request\.formData\(\)/u);
  assert.match(sw,/request\.method === 'POST'/u);
  assert.match(sw,/saveIncoming\(text\)/u);
});
test('hosted smoke does not issue mutation actions or send player JWT', () => {
  const s=file('scripts/release/hosted-smoke.mjs');
  assert.match(s,/action:'my_leagues'/u);
  assert.doesNotMatch(s,/action:'submit'|action:'review'|access_token/u);
});
test('remote script previews migrations without executing db push', () => {
  const s=file('scripts/release/remote-dry-run.sh');
  assert.match(s,/db push --dry-run --linked/u);
  assert.doesNotMatch(s,/db reset|db push --linked\s*\n/u);
});
test('hosted workflow uses no server secrets and runs full check', () => {
  const s=file('.github/workflows/release-readiness.yml');
  assert.match(s,/npm ci/u);
  assert.match(s,/npm run check/u);
  assert.doesNotMatch(s,/SUPABASE_ACCESS_TOKEN|SERVICE_ROLE_KEY|db push|cloudflare deploy/u);
});

test('CSP allows only the selected managed API as a connect target', () => {
  const csp = productionCsp(base.VITE_SUPABASE_URL);
  assert.match(csp, /connect-src 'self' https:\/\/abcdefghijklmnopqrst\.supabase\.co/u);
  assert.match(csp, /frame-ancestors 'none'/u);
  assert.doesNotMatch(csp, /unsafe-eval|connect-src \*/u);
  assert.throws(() => productionCsp('http://localhost:54321'), /Unsafe CSP/u);
});
