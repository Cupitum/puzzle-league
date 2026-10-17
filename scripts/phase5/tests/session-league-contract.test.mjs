import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app = readFileSync('src/ui/App.tsx', 'utf8');
const transport = readFileSync('src/infrastructure/client.ts', 'utf8');

test('Android PWA session is shared across windows and persists with explicit sign-out', () => {
  assert.match(transport, /localStorage\.setItem\(SESSION_STORAGE_KEY/);
  assert.match(transport, /localStorage\.getItem\(SESSION_STORAGE_KEY/);
  assert.match(transport, /localStorage\.removeItem\(SESSION_STORAGE_KEY/);
  assert.match(app, /addEventListener\('storage', stored\)/);
  assert.match(app, /addEventListener\('visibilitychange', visible\)/);
});
test('league creation returns owner directly to its newly-created season setup', () => {
  assert.match(app, /api\.call\('create_league'/);
  assert.match(app, /setLeagueId\(result\.league_id\)/);
  assert.match(app, /await loadLeague\(result\.league_id\)/);
  assert.match(app, /<h1>Set up your first season<\/h1>/);
});
test('season game settings remain separate from league creation and server-authoritative', () => {
  assert.match(app, /api\.call\('create_league', \{/);
  assert.match(app, /act\('start_season', \{\s*league_id: leagueId, cadence/);
  assert.match(app, /act\('schedule_games', \{ league_id: leagueId, games \}/);
  assert.doesNotMatch(app, /calculateAwardedPoints/);
});

test('new league opens a dedicated first-season screen, not a lower page section', () => {
  const ui = readFileSync('src/ui/App.tsx', 'utf8');
  assert.match(ui, /type Page = .*'season-setup'/);
  assert.match(ui, /setLeagueId\(result\.league_id\);[\s\S]*?setPage\('season-setup'\)/);
  assert.match(ui, /\{page === 'season-setup' && <>/);
  assert.match(ui, /<h1>Set up your first season<\/h1>/);
  assert.match(ui, /<h1>\{selected\?\.name \?\? 'Your league'\}<\/h1>/);
  assert.match(ui, /<GameChecks selection=\{games\} setSelection=\{setGames\} \/>/);
  assert.match(ui, /<Button secondary onClick=\{\(\) => setPage\('leagues'\)\}>Back to leagues<\/Button>/);
  assert.doesNotMatch(ui, /<Section title="Step 2 · Choose games and start the first season"/);
});
test('reopening an owned league without seasons can reach setup directly', () => {
  const ui = readFileSync('src/ui/App.tsx', 'utf8');
  assert.match(ui, /loadLeague\(id, true\)/);
  assert.match(ui, /\? 'season-setup' : 'league-detail'/);
  assert.match(ui, /data\.length === 0 && leagues\.some\(l => l\.league_id === id && l\.is_owner\)/);
  assert.match(ui, /<Button onClick=\{\(\) => setPage\('league-detail'\)\}>Open league management<\/Button>/);
});
test('session refresh checks nullable shared session before reading expiry', () => {
  const api = readFileSync('src/infrastructure/client.ts', 'utf8');
  assert.equal((api.match(/if \(shared && shared\.user\.id === this\.session\?\.user\.id &&/gu) ?? []).length, 2);
  assert.doesNotMatch(api, /if \(shared\?\.user\.id === this\.session\?\.user\.id &&\s*shared\.expires_at/);
});
