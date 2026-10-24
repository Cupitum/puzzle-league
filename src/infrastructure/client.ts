/** Browser transport for already-authorised Phase 4 RPCs. No client award authority. */
export interface BackendConfig { readonly url: string; readonly key: string }
export interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } }
export type Payload = Record<string, unknown>;
export type RpcResult = { ok: true; result: unknown } | { ok?: false; error?: string; code?: number };
/** Same-origin PWA windows (including Android Share Target launches) must share login state. */
export const SESSION_STORAGE_KEY = 'puzzle-league.session.v2';
const LEGACY_SESSION_KEY = 'puzzle-league.session.v1';
const REFRESH_MARGIN_SECONDS = 60;

/** Public *display* name, not a unique login handle; Auth still uses email. */
export function validPublicUsername(value: string): boolean {
  return value === value.trim() && /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,38}[\p{L}\p{N}]$/u.test(value);
}

export function backendConfig(url: string | undefined, key: string | undefined): BackendConfig | null {
  if (!url && !key) return null;
  if (!url || !key || key.startsWith('sb_secret_') || /\s/u.test(key)) return null;
  try {
    const u = new URL(url);
    if (u.username || u.password || u.search || u.hash || u.pathname !== '/' ||
        !(['https:', 'http:'].includes(u.protocol))) return null;
    if (u.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return null;
    return { url: u.origin, key };
  } catch { return null; }
}
export function safeUrl(base: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new Error('Invalid backend path');
  return `${base}${path}`;
}
/** Advisory signup policy; the authoritative Auth server may enforce stricter rules. */
export const signupPasswordRules = [
  { label: 'At least 10 characters', check: (v: string) => v.length >= 10 },
  { label: 'An uppercase and a lowercase letter', check: (v: string) => /[A-Z]/u.test(v) && /[a-z]/u.test(v) },
  { label: 'A number', check: (v: string) => /[0-9]/u.test(v) },
  { label: 'A special character (for example !, @ or #)', check: (v: string) => /[^A-Za-z0-9]/u.test(v) },
];
export const signupPasswordValid = (value: string) => signupPasswordRules.every(rule => rule.check(value));
const authMessage: Record<string,string> = {
  weak_password:'This password does not meet the authentication server requirements. Use a longer password containing uppercase and lowercase letters, a number and a symbol.',
  user_already_exists:'This email may already have an account. Try signing in or use account recovery.',
  email_exists:'This email may already have an account. Try signing in.',
  signup_disabled:'Account registration is temporarily disabled by the authentication provider.',
  email_not_confirmed:'Please complete the email confirmation first; check your inbox and spam folder.',
  invalid_credentials:'Email or password is incorrect.',
  over_request_rate_limit:'Too many attempts. Try again later.',
  validation_failed:'The authentication service rejected the supplied information. Check your email and password requirements.',
  email_address_invalid:'Enter a valid email address.',
};
export function safeAuthError(status:number,body:unknown):string {
  const code = body && typeof body === 'object' && typeof (body as Payload).code === 'string'
    ? String((body as Payload).code) : '';
  const knownMessage = Object.prototype.hasOwnProperty.call(authMessage, code) ? authMessage[code] : undefined;
  if (knownMessage !== undefined) return knownMessage;
  if (status === 422) return 'Account could not be created (HTTP 422). Check the password requirements, email address and existing account status.';
  if (status >= 500) return 'Authentication service error (HTTP 500). This may involve the signup database trigger or email delivery. Please contact the pilot administrator; no account or points were confirmed.';
  return errorFromResponse(status);
}
function errorFromResponse(status: number): string {
  if (status === 400) return 'Request rejected. Check the email/password fields or email confirmation status.';
  if (status === 401) return 'Sign-in failed or your session expired. Verify your credentials and try again.';
  if (status === 403) return 'Permission denied. The league or action may not be available to you.';
  if (status === 409) return 'Request could not be completed. Check membership, duplicate, or review requirements.';
  if (status === 429) return 'Too many requests. Please try again later.';
  return `Request failed (HTTP ${status}). No local points have been awarded.`;
}
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export function toSession(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.access_token !== 'string' || typeof v.refresh_token !== 'string' ||
      typeof v.expires_at !== 'number' || !v.user || typeof v.user !== 'object' ||
      typeof (v.user as Payload).id !== 'string') return null;
  return v as unknown as Session;
}

export class CompetitionClient {
  private session: Session | null = null;
  private refreshing: Promise<Session | null> | null = null;
  constructor(readonly config: BackendConfig) {}
  get currentSession(): Session | null { return this.session; }
  get userId(): string | null { return this.session?.user.id ?? null; }
  private async request(path: string, method = 'GET', body?: unknown, useAuth = true): Promise<unknown> {
    const headers: Record<string, string> = { apikey: this.config.key, accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (useAuth && this.session) headers.authorization = `Bearer ${this.session.access_token}`;
    if (body !== undefined && (method === 'GET' || method === 'HEAD')) {
      throw new ApiError('GET and HEAD requests cannot contain a body.', 0);
    }
    const options: RequestInit = { method, headers, cache: 'no-store' };
    if (body !== undefined) options.body = JSON.stringify(body);
    let response: Response;
    try { response = await fetch(safeUrl(this.config.url, path), options); }
    catch { throw new ApiError('Network unavailable. Your action was not confirmed by the server.', 0); }
    let result: unknown;
    try { result = await response.json(); } catch { result = null; }
    if (!response.ok) throw new ApiError(path.startsWith('/auth/v1/')
      ? safeAuthError(response.status, result) : errorFromResponse(response.status), response.status);
    return result;
  }
  private save(session: Session | null): void {
    this.session = session;
    try {
      if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch { /* Storage may be blocked; retain the current in-memory session. */ }
    try { sessionStorage.removeItem(LEGACY_SESSION_KEY); } catch { /* legacy storage unavailable */ }
  }
  /**
   * Restore across standalone PWA windows and Android Share Target launches.
   * Do NOT rotate a valid refresh token each time a window opens: doing so would
   * invalidate another window's token and appear to sign the player out.
   */
  async recover(): Promise<Session | null> {
    let saved: Session | null = null;
    let storageAvailable = false;
    let migrated = false;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      storageAvailable = true;
      if (raw) saved = toSession(JSON.parse(raw));
      else {
        try {
          const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
          if (legacy) { saved = toSession(JSON.parse(legacy)); migrated = Boolean(saved); }
        } catch { /* no legacy storage */ }
      }
    } catch { /* Private browsing or disabled local storage: in-memory only. */ }
    if (saved) {
      this.session = saved;
      if (migrated) this.save(saved);
    } else if (storageAvailable) {
      // A different PWA window may have explicitly signed out.
      this.session = null;
    }
    if (!this.session) return null;
    if (this.session.expires_at > Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS) return this.session;
    return this.refresh();
  }
  private async refresh(): Promise<Session | null> {
    if (!this.session) return null;
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        // Prefer the latest token from another window before rotating a refresh token.
        try {
          const raw = localStorage.getItem(SESSION_STORAGE_KEY);
          const shared = raw ? toSession(JSON.parse(raw)) : null;
          if (shared && shared.user.id === this.session?.user.id &&
              shared.expires_at > Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS) {
            this.session = shared;
            return shared;
          }
          if (shared?.user.id === this.session?.user.id) this.session = shared;
        } catch { /* storage unavailable */ }
        const body = await this.request('/auth/v1/token?grant_type=refresh_token', 'POST',
          { refresh_token: this.session?.refresh_token }, false);
        const next = toSession(body);
        if (!next) { this.save(null); return null; }
        this.save(next);
        return next;
      } catch (error) {
        // Another Android PWA window might have rotated this refresh token first.
        // Adopt its valid new session instead of treating our stale-token 401 as logout.
        try {
          const raw = localStorage.getItem(SESSION_STORAGE_KEY);
          const shared = raw ? toSession(JSON.parse(raw)) : null;
          if (shared && shared.user.id === this.session?.user.id &&
              shared.expires_at > Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS) {
            this.session = shared;
            return shared;
          }
        } catch { /* storage unavailable */ }
        // A lost connection is NOT a sign-out. Preserve credentials for retry on focus.
        if (error instanceof ApiError && [400, 401, 403].includes(error.status)) this.save(null);
        return null;
      }
    })();
    try { return await this.refreshing; } finally { this.refreshing = null; }
  }
  /**
   * Supabase Auth keeps the requested display name in account metadata through email
   * verification. On first authenticated login, the existing trusted Phase 4 RPC
   * applies it only if the DB profile still has its generated Player- nickname.
   * User-editable Auth metadata never grants permissions or influences scoring.
   */
  private async finishSignupUsername(): Promise<'applied' | 'not_needed' | 'failed'> {
    const requested = this.session?.user.user_metadata?.puzzle_league_nickname;
    if (typeof requested !== 'string' || !validPublicUsername(requested)) return 'not_needed';
    try {
      const profile = await this.select<{ nickname: string }>('profiles',
        `select=nickname&id=eq.${encodeURIComponent(this.userId ?? '')}`);
      const currentProfile = profile[0];
      if (profile.length !== 1 || !currentProfile || !/^Player-[a-f0-9]{12}$/u.test(currentProfile.nickname)) return 'not_needed';
      await this.call('update_profile', { nickname: requested });
      return 'applied';
    } catch { return 'failed'; }
  }
  async authenticate(email: string, password: string, signup: boolean, requestedUsername?: string): Promise<{ session: Session | null; message: string }> {
    if (!email.includes('@') || password.length < 6) throw new ApiError('Enter a valid email and password (at least 6 characters).', 0);
    const username = requestedUsername?.trim() ?? '';
    if (signup && !validPublicUsername(username)) throw new ApiError('Choose a public username (3–40 letters, numbers, spaces, dots, dashes or underscores).', 0);
    if (signup && !signupPasswordValid(password)) throw new ApiError('Choose a password that meets all four displayed security requirements.', 0);
    const payload = signup ? { email, password, data: { puzzle_league_nickname: username } } : { email, password };
    const body = await this.request(signup ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', 'POST', payload, false);
    const session = toSession(body);
    if (session) {
      this.save(session);
      const sync = await this.finishSignupUsername();
      return { session, message: sync === 'failed'
        ? 'Signed in, but your display name could not be saved. Update it under Player profile.'
        : 'Signed in securely.' };
    }
    if (signup) return { session: null, message: 'Signup request received. Supabase confirmation is currently required: confirm your email before signing in. When the separate pilot verification flow is enabled, you will be able to sign in before verification.' };
    throw new ApiError('Sign-in returned no session. Check your credentials and email confirmation.', 401);
  }
  async resendNativeSignupConfirmation(email: string): Promise<void> {
    if (!email.includes('@')) throw new ApiError('Enter your signup email address.', 0);
    await this.request('/auth/v1/resend', 'POST', { type: 'signup', email }, false);
  }
  async signOut(): Promise<void> {
    try { if (this.session) await this.request('/auth/v1/logout', 'POST', {}, true); }
    catch { /* offline logout still revokes the current tab session locally */ }
    finally { this.save(null); }
  }
  async call(action: string, data: Payload = {}): Promise<unknown> {
    if (this.session && this.session.expires_at <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS) await this.refresh();
    if (action !== 'standings' && (!this.session || this.session.expires_at <= Math.floor(Date.now() / 1000))) throw new ApiError('Your session needs reconnecting. Check your connection and reopen Account; your submission draft is safe.', 401);
    const execute = async () => {
      const res = await this.request('/functions/v1/competition', 'POST', { action, data });
      if (!res || typeof res !== 'object' || (res as RpcResult).ok !== true) throw new ApiError('The competition server did not confirm this action.', 502);
      return (res as { result: unknown }).result;
    };
    try { return await execute(); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401 && this.session && await this.refresh()) return execute();
      throw error;
    }
  }
  async select<T>(table: 'leagues' | 'profiles' | 'league_memberships', query: string): Promise<T[]> {
    if (this.session && this.session.expires_at <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS) await this.refresh();
    const result = await this.request(`/rest/v1/${table}?${query}`);
    return Array.isArray(result) ? result as T[] : [];
  }
  async roleRpc(name: 'set_league_moderator' | 'set_league_moderator_permission', data: Payload): Promise<void> {
    if (!this.session) throw new ApiError('Sign in first.', 401);
    await this.request(`/rest/v1/rpc/${name}`, 'POST', data);
  }
}
export const client = (() => {
  const config = backendConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return config ? new CompetitionClient(config) : null;
})();
