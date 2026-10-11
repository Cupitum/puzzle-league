import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkExampleEnv, isSensitiveEnvFile } from './config-policy.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
const errors = checkExampleEnv(readFileSync(join(root, '.env.example'), 'utf8'));
if (!/^\.env$/m.test(ignore) || !/^\.env\.\*$/m.test(ignore) || !/^!\.env\.example$/m.test(ignore)) {
  errors.push('.gitignore must ignore .env and .env.* except .env.example');
}
if (existsSync(join(root, '.git'))) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(Boolean);
  for (const file of tracked) {
    if (isSensitiveEnvFile(file)) errors.push(`Tracked secret-prone environment file: ${file}`);
  }
  console.log('Tracked environment files checked against git ls-files.');
} else {
  console.log('Archive has no .git: tracked-file check unavailable (Git ignore and template still checked).');
}
if (errors.length > 0) {
  for (const err of errors) console.error(`FAIL: ${err}`);
  process.exitCode = 1;
} else {
  console.log('PASS: Phase 2 public configuration and .env tracking policy.');
}
