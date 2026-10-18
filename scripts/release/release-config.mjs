/** Public production build configuration. Never export any server credential. */
export function validateProductionEnv(env) {
  const bad = (message) => { throw new Error(`Release configuration invalid: ${message}`); };
  if (env.VITE_APP_STAGE !== 'production') bad('VITE_APP_STAGE must be production');
  const raw = env.VITE_SUPABASE_URL;
  if (typeof raw !== 'string' || !raw) bad('missing VITE_SUPABASE_URL');
  let url;
  try { url = new URL(raw); } catch { bad('invalid API URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || url.port || !url.hostname.includes('.') ||
      /(^localhost$|\.localhost$|^127\.|^10\.|^192\.168\.|^0\.|^172\.(1[6-9]|2\d|3[01])\.)/u.test(url.hostname)) {
    bad('API URL must be a public HTTPS origin without path, credentials, or query');
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]{12,}$/u.test(key) ||
      /\s/u.test(key)) bad('provide only a Supabase sb_publishable_ public key');
  const forbiddenNames = Object.keys(env).filter((name) => /^(VITE_)/u.test(name) &&
    !['VITE_APP_STAGE','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].includes(name));
  if (forbiddenNames.length) bad('unexpected browser-exposed VITE_ variable(s)');
  if (env.VITE_SUPABASE_URL === 'http://127.0.0.1:54321') bad('local backend forbidden');
  return Object.freeze({ apiOrigin: url.origin, publicKey: key });
}

/** Project-specific, host-generated CSP: never interpolate untrusted HTML. */
export function productionCsp(apiOrigin) {
  const u = new URL(apiOrigin);
  if (u.protocol !== 'https:' || u.origin !== apiOrigin) throw new Error('Unsafe CSP API origin');
  return [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-ancestors 'none'", "form-action 'self'",
    "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:", "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`, "worker-src 'self'", "manifest-src 'self'"
  ].join('; ');
}

/** Reject actual server credentials, not the browser's rejection-code prefix. */
export function validateProductionBundle(bundles, apiOrigin) {
  if (typeof bundles !== 'string' || !bundles.includes(apiOrigin))
    throw new Error('Expected public HTTPS API origin not in bundled client');
  if (bundles.includes('http://127.0.0.1:54321') ||
      /sb_secret_[A-Za-z0-9_-]{12,}/u.test(bundles))
    throw new Error('Development API URL or server-only key value detected in bundle');
}
