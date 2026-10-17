import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
test('signup includes username + confirm and show password, never a client profile INSERT', () => {
  const form=read('src/ui/App.tsx');
  assert.match(form, /Public username \(display name\)/);
  assert.match(form, /Confirm password/);
  assert.match(form, /Show passwords/);
  assert.match(form, /password !== confirmPassword/);
  assert.match(form, /validPublicUsername/);
  assert.doesNotMatch(form, /from\(['"]profiles['"]\)\.insert/);
});
test('username travels via Auth metadata and trusted profile action only', () => {
  const c=read('src/infrastructure/client.ts');
  assert.match(c, /puzzle_league_nickname: username/);
  assert.match(c, /'update_profile'/);
  assert.match(c, /Player-\[a-f0-9\]/);
  assert.doesNotMatch(c, /SERVICE_ROLE_KEY/);
});
test('env creator refuses overwrite and privileged keys', () => {
  const py=read('scripts/phase5/configure_local_env.py');
  assert.match(py, /target\.exists\(\)/);
  assert.match(py, /"git", "check-ignore"/);
  assert.match(py, /claims\.get\("role"\) != "anon"/);
  assert.match(py, /os\.umask\(0o077\)/);
});
