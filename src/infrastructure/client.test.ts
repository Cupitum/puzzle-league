import { describe, expect, it } from 'vitest';
import { backendConfig, safeUrl, toSession } from './client';
describe('Phase 5 public-only client security', () => {
  it('accepts local development and HTTPS but refuses untrusted HTTP and secret keys', () => {
    expect(backendConfig('http://127.0.0.1:54321', 'anon-public')?.url).toBe('http://127.0.0.1:54321');
    expect(backendConfig('https://project.supabase.co', 'sb_publishable_demo')).not.toBeNull();
    expect(backendConfig('http://private.lan:54321', 'abc')).toBeNull();
    expect(backendConfig('https://host.example', 'sb_secret_foo')).toBeNull();
    expect(backendConfig('https://username:password@host.example', 'public')).toBeNull();
    expect(backendConfig(undefined, undefined)).toBeNull();
  });
  it('prevents caller-controlled absolute URLs', () => {
    expect(() => safeUrl('https://host.example', '//evil.example')).toThrow();
    expect(() => safeUrl('https://host.example', '/../../secret')).toThrow();
    expect(safeUrl('https://host.example', '/functions/v1/competition')).toContain('competition');
  });
  it('rejects incomplete saved sessions', () => {
    expect(toSession({ access_token: 'a' })).toBeNull();
  });
});

describe('Phase 5 registration contract', () => {
  it('requires a safe public display name, with Unicode names allowed', async () => {
    const { validPublicUsername } = await import('./client');
    expect(validPublicUsername('Puzzle Player')).toBe(true);
    expect(validPublicUsername('李小明')).toBe(true);
    expect(validPublicUsername('a')).toBe(false);
    expect(validPublicUsername(' <script> ')).toBe(false);
  });
  it('sends selected username only to Auth metadata, then uses trusted profile RPC after successful sign-in', async () => {
    const { CompetitionClient } = await import('./client');
    const api = new CompetitionClient({ url: 'http://127.0.0.1:54321', key: 'public-local' });
    const requests: { url: string; init: RequestInit }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      requests.push({ url, init: init ?? {} });
      if (url.includes('/auth/v1/signup')) {
        return new Response(JSON.stringify({ user: { id: 'pending-confirmation' }, session: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    try {
      const response = await api.authenticate('someone@example.org', 'safe-password', true, 'New Player');
      expect(response.session).toBeNull();
      expect(response.message).toContain('first login');
      const signupRequest = requests.find(request => request.url.includes('/auth/v1/signup'));
      if (!signupRequest) throw new Error('Expected a signup request');
      const sent = JSON.parse(String(signupRequest.init.body)) as { data: { puzzle_league_nickname: string } };
      expect(sent.data.puzzle_league_nickname).toBe('New Player');
      expect(signupRequest.url).toContain('/auth/v1/signup');
    } finally { globalThis.fetch = original; }
  });
});

describe('new account public username application', () => {
  it('applies the chosen name only to the authenticated default profile', async () => {
    const { CompetitionClient } = await import('./client');
    const c = new CompetitionClient({ url: 'http://127.0.0.1:54321', key: 'public-local' });
    const calls: { url: string; body: string }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, body: String(init?.body ?? '') });
      if (url.includes('/auth/v1/token')) return new Response(JSON.stringify({
        access_token: 'signed-jwt', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'uid', user_metadata: { puzzle_league_nickname: 'New Player' } },
      }), { status: 200 });
      if (url.includes('/rest/v1/profiles')) return new Response('[{"nickname":"Player-123456789abc"}]', { status: 200 });
      if (url.includes('/functions/v1/competition')) return new Response('{"ok":true,"result":{"nickname":"New Player"}}', { status: 200 });
      return new Response('{}', { status: 200 });
    };
    try {
      const result = await c.authenticate('someone@example.org', 'safe-password', false);
      expect(result.session?.user.id).toBe('uid');
      const update = calls.find(r => r.url.includes('/functions/v1/competition'));
      expect(update).toBeDefined();
      expect(JSON.parse(update?.body ?? '{}')).toEqual({ action: 'update_profile', data: { nickname: 'New Player' } });
    } finally { globalThis.fetch = original; }
  });
  it('does not override a custom display name at later login', async () => {
    const { CompetitionClient } = await import('./client');
    const c = new CompetitionClient({ url: 'http://127.0.0.1:54321', key: 'public-local' });
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input); calls.push(url);
      if (url.includes('/auth/v1/token')) return new Response(JSON.stringify({
        access_token: 'signed-jwt', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'uid', user_metadata: { puzzle_league_nickname: 'Signup Player' } },
      }), { status: 200 });
      if (url.includes('/rest/v1/profiles')) return new Response('[{"nickname":"My Current Name"}]', { status: 200 });
      return new Response('{}', { status: 200 });
    };
    try {
      await c.authenticate('someone@example.org', 'safe-password', false);
      expect(calls.some(url => url.includes('/functions/v1/competition'))).toBe(false);
    } finally { globalThis.fetch = original; }
  });
});
