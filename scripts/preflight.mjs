import { execFileSync } from 'node:child_process';
import { platform, release } from 'node:os';

const ver = process.versions.node.split('.').map(Number);
const nodeOK = ver[0] > 22 || (ver[0] === 22 && (ver[1] > 12 || (ver[1] === 12 && ver[2] >= 0)));
function run(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'NOT FOUND'; }
}
console.log(`Platform: ${platform()} ${release()}`);
console.log(`Node.js: ${process.version} (${nodeOK ? 'compatible' : 'needs upgrade >=22.12'})`);
console.log(`npm: ${run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'])}`);
console.log(`Git: ${run('git', ['--version'])}`);
console.log(`Python: ${run(process.platform === 'win32' ? 'py' : 'python3', ['--version'])}`);
if (!nodeOK) process.exitCode = 1;
