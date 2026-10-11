import test from 'node:test';
import assert from 'node:assert/strict';
import { checkExampleEnv, isSensitiveEnvFile } from '../scripts/config-policy.mjs';

test('safe public-only example variables are accepted', () => {
  assert.deepEqual(checkExampleEnv('# optional\nVITE_APP_STAGE=\n# VITE_SUPABASE_URL=\n'), []);
});
test('unknown VITE keys, credentials and malformed syntax are rejected', () => {
  const errors = checkExampleEnv('VITE_SUPABASE_SERVICE_ROLE_KEY=anything\nVITE_SUPABASE_PUBLISHABLE_KEY=live-value\nBROKEN');
  assert.equal(errors.length, 4);
});
test('env-file detection identifies secrets-prone tracked names, not the template', () => {
  assert.equal(isSensitiveEnvFile('some/.env.production'), true);
  assert.equal(isSensitiveEnvFile('.env'), true);
  assert.equal(isSensitiveEnvFile('.env.example'), false);
  assert.equal(isSensitiveEnvFile('src/domain/games/catalog.ts'), false);
});
