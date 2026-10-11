/** Pure, dependency-free foundation safety rules; not comprehensive secret scanning. */
const ALLOWED_PUBLIC_KEYS = new Set([
  'VITE_APP_STAGE',
  // Reserved future public-only identifiers; not wired to any service yet.
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
]);

export function checkExampleEnv(contents) {
  const problems = [];
  for (const [index, line] of contents.split(/\r?\n/u).entries()) {
    const value = line.trim();
    if (value === '' || value.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/u.exec(value);
    if (!match) {
      problems.push(`.env.example:${index + 1}: invalid assignment`);
      continue;
    }
    const [, key, raw] = match;
    if (!key.startsWith('VITE_') || !ALLOWED_PUBLIC_KEYS.has(key)) {
      problems.push(`.env.example:${index + 1}: disallowed public variable ${key}`);
    }
    // The template must never contain anything resembling a usable credential.
    if (key !== 'VITE_APP_STAGE' && raw.trim() !== '') {
      problems.push(`.env.example:${index + 1}: public identifier must be blank`);
    }
    if (key === 'VITE_APP_STAGE' && !['', 'local', 'test', 'production'].includes(raw.trim())) {
      problems.push(`.env.example:${index + 1}: invalid public stage`);
    }
  }
  return problems;
}

export function isSensitiveEnvFile(file) {
  const name = file.replaceAll('\\', '/').split('/').at(-1);
  return name === '.env' || (name?.startsWith('.env.') === true && name !== '.env.example');
}
