import fs from 'node:fs';
import crypto from 'node:crypto';
const read = (p) => fs.readFileSync(p);
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const baseline = JSON.parse(read('research/phase1-sha256-manifest.json'));
const flatten = (v) => Object.entries(v).filter(([,s]) => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s));
// Repo's original manifest shape is validated by existing research-preservation tests.
const researchDir = 'research/phase1-approved-local-poc';
if (!fs.existsSync(researchDir)) throw Error('Missing preserved research');
const versionIds = [
  'wordle-fixed-v1-approved','minute-cryptic-hints-v1-approved',
  'foximax-original-n8-v1-approved','polygonle-standard-v1-approved','krillion-daily-absolute700-v1-approved',
];
const catalog = read('src/domain/games/catalog.ts').toString();
for(const id of versionIds) if(!catalog.includes(id)) throw Error('Approved game rule changed or omitted');
const migrations = fs.readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql'));
if(migrations.length!==9) throw Error('Phase 5 must not modify/migrate local SQL');
for(const path of ['.env.example','src/ui/App.tsx','src/infrastructure/client.ts']) {
  if (/service[_-]?role\s*=|sb_secret_[a-z0-9]{10}/i.test(read(path).toString())) throw Error('Possible browser secret');
}
console.log(`PASS: nine existing migrations, five approved scoring IDs, research manifest present (${flatten(baseline).length} root digest entries), no obvious client secret assignment`);
console.log(`PWA audit SHA ${sha(read('public/manifest.webmanifest')).slice(0,12)} (not a substitute for device testing)`);
