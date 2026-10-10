import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

test('metadata is configured as a private non-published package', () => {
  const pkg = readJSON('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.test, 'vitest run');
  assert.equal(pkg.scripts.build, 'tsc -b && vite build');
});
test('the required source skeleton and approved contract exist', () => {
  for (const path of ['index.html', 'vite.config.ts', 'src/App.tsx', 'src/catalog.ts',
      'src/catalog.test.ts', 'research/phase1-approved-local-poc/approved_scoring_rules_v1.json']) {
    assert.ok(existsSync(join(root,path)), `missing ${path}`);
  }
  const contract = readJSON('research/phase1-approved-local-poc/approved_scoring_rules_v1.json');
  assert.deepEqual(Object.keys(contract.rule_versions),
    ['wordle','minute_cryptic','foximax','polygonle','krillion']);
  assert.equal(contract.implementation_scope, 'standalone POC previews, no league award or server writes');
});
test('every copied Phase 1 source file remains byte-identical to the uploaded ZIP', () => {
  const manifest = readJSON('research/phase1-sha256-manifest.json');
  assert.equal(Object.keys(manifest).length, 35);
  for (const [relative, expected] of Object.entries(manifest)) {
    const actual = createHash('sha256').update(readFileSync(join(root,'research/phase1-approved-local-poc',relative))).digest('hex');
    assert.equal(actual, expected, `Phase 1 source modified: ${relative}`);
  }
});
test('no live app credentials included in tracked example', () => {
  assert.ok(existsSync(join(root, '.env.example')));
  assert.ok(!existsSync(join(root,'.env')));
  assert.match(readFileSync(join(root,'.gitignore'),'utf8'), /^\.env$/m);
});
