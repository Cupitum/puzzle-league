import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const researchRoot = join(root, 'research', 'phase1-approved-local-poc');
const cmd = process.platform === 'win32' ? 'py' : 'python3';
const args = process.platform === 'win32'
  ? ['-3', '-m', 'unittest', 'discover', '-q']
  : ['-m', 'unittest', 'discover', '-q'];

console.log(`Running immutable Phase 1 Python regression suite with ${cmd}`);
const result = spawnSync(cmd, args, { cwd: researchRoot, stdio: 'inherit' });
if (result.error) {
  console.error(`Python unavailable: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status === 0 ? 0 : 1;
}
