import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
test('Manifest has installable Android text Share Target and root scope', () => {
  const m = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(m.start_url, '/');assert.equal(m.scope, '/');assert.equal(m.display, 'standalone');
  assert.equal(m.share_target.action, '/share-target');
  assert.equal(m.share_target.method, 'POST');assert.equal(m.share_target.enctype, 'multipart/form-data');
  assert.deepEqual(m.share_target.params, { title:'title', text:'text', url:'url' });
  for (const n of [192,512]) { const b = fs.readFileSync(`public/icons/icon-${n}.png`); assert.equal(b.subarray(1,4).toString(), 'PNG'); }
});
test('SW intercepts one-time share, never exports raw result in a query string or caches API', () => {
  const sw = read('public/sw.js');
  assert.match(sw, /url\.pathname === '\/share-target'/);
  assert.match(sw, /request\.formData\(\)/);
  assert.match(sw, /sharedText : fallback/); // Do not append title trailers to genuine game shares.
  assert.match(sw, /indexedDB\.open\(DB_NAME/);
  assert.doesNotMatch(sw, /encodeURIComponent\(text\)|searchParams\.set\('text'/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /request\.method !== 'GET'/);
});
test('Result submission is confirmation-first, server-authoritative, and preserves pending', () => {
  const ui = read('src/ui/App.tsx'); const api = read('src/infrastructure/client.ts');
  assert.match(ui, /I confirm this is my own completed result/);
  assert.match(ui, /api\.call\('submit', \{ raw_text: rawText, method: shareMethod \}\)/);
  assert.match(ui, /review_required/);
  assert.doesNotMatch(ui, /performance_points:|participation_points:/);
  assert.match(api, /\/functions\/v1\/competition/);
  assert.doesNotMatch(api, /SERVICE_ROLE_KEY|sb_secret_foo/);
});
test('Phase 4 trusted server and all migration names are preserved', () => {
  const edge = read('supabase/functions/competition/index.ts');
  assert.match(edge, /p4_dispatch/);
  assert.match(edge, /'submit'/);
  const migrations = fs.readdirSync('supabase/migrations').filter(s=>s.endsWith('.sql'));
  assert.equal(migrations.filter(s=>s < '20261017190000').length,9); // original Phase 4 baseline
  assert.equal(migrations.filter(s=>s < '20261023100000').length,13); // frozen hosted baseline
  assert.equal(migrations.filter(s=>s >= '20261023100000').length,2); // new un-applied polishing candidate
});
