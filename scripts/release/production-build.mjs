/** Cloudflare Pages build command: node scripts/release/production-build.mjs */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateProductionEnv, productionCsp } from './release-config.mjs';
const root = resolve(import.meta.dirname, '../..');
try {
  const config = validateProductionEnv(process.env);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error('Vite build did not pass');
  const dist = join(root, 'dist');
  for (const name of ['index.html', 'manifest.webmanifest', 'sw.js', '_redirects', '_headers']) {
    if (!existsSync(join(dist, name))) throw new Error(`Distribution is missing ${name}`);
  }
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  if (manifest.share_target?.action !== '/share-target' || manifest.share_target?.method !== 'POST' ||
      manifest.share_target?.enctype !== 'multipart/form-data') throw new Error('Share target contract changed');
  const headersPath = join(dist, '_headers');
  let headers = readFileSync(headersPath, 'utf8');
  if (!headers.startsWith('/*\n')) throw new Error('Unexpected Cloudflare headers format');
  headers = headers.replace('/*\n', `/*\n  Content-Security-Policy: ${productionCsp(config.apiOrigin)}\n`);
  writeFileSync(headersPath, headers, 'utf8');
  if (!headers.includes('X-Content-Type-Options: nosniff') ||
      !headers.includes('/sw.js')) throw new Error('Missing static security headers');
  const files = readdirSync(join(dist, 'assets')).filter(f => f.endsWith('.js'));
  if (!files.length) throw new Error('Missing bundled JavaScript assets');
  const bundles = files.map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
  if (!bundles.includes(config.apiOrigin)) throw new Error('Expected public HTTPS API origin not in bundled client');
  if (bundles.includes('http://127.0.0.1:54321') || bundles.includes('sb_secret_'))
    throw new Error('Development API URL or server-only key marker detected in bundle');
  console.log('PHASE 6 PUBLIC HTTPS PRODUCTION BUILD: PASS (credentials not printed)');
} catch (error) {
  console.error('PHASE 6 PRODUCTION BUILD: FAIL:', error.message);
  process.exitCode = 1;
}
