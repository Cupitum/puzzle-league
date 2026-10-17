import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, CompetitionClient, SESSION_STORAGE_KEY } from './client';

type SessionData = { access_token: string; refresh_token: string; expires_at: number; user: { id: string } };
const origin = 'http://127.0.0.1:54321';
const person = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function token(offset = 3600): SessionData {
  return { access_token: 'test-jwt', refresh_token: 'test-refresh',
    expires_at: Math.floor(Date.now() / 1000) + offset, user: { id: person } };
}
function storage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => { data.clear(); },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const makeClient = () => new CompetitionClient({ url: origin, key: 'public-anon-test' });
afterEach(() => vi.unstubAllGlobals());

describe('Phase 5 persistent same-origin PWA session', () => {
  it('a new Android Share window sees the login without rotating a valid token', async () => {
    const saved = storage();
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', storage());
    const fetcher = vi.fn(async (url: string) => url.includes('token') ? json(token()) : json({ ok: true, result: [] }));
    vi.stubGlobal('fetch', fetcher);
    const windowA = makeClient();
    const signedIn = await windowA.authenticate('member@example.test', 'password123', false);
    expect(signedIn.session?.user.id).toBe(person);
    const windowB = makeClient();
    expect((await windowB.recover())?.user.id).toBe(person);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await windowB.call('my_leagues');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(saved.getItem(SESSION_STORAGE_KEY)).toContain('test-refresh');
  });

  it('sign out in one window invalidates the saved login for other windows', async () => {
    const saved = storage();
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('token') ? json(token()) : json({})));
    const windowA = makeClient();
    const windowB = makeClient();
    await windowA.authenticate('member@example.test', 'password123', false);
    await windowB.recover();
    await windowA.signOut();
    expect(saved.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(await windowB.recover()).toBeNull();
    await expect(windowB.call('my_leagues')).rejects.toBeInstanceOf(ApiError);
  });

  it('expired credentials refresh only when needed, and persist the replacement', async () => {
    const saved = storage();
    saved.setItem(SESSION_STORAGE_KEY, JSON.stringify(token(-3)));
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', storage());
    const fetcher = vi.fn(async () => json({ ...token(7200), access_token: 'rotated-jwt', refresh_token: 'rotated-refresh' }));
    vi.stubGlobal('fetch', fetcher);
    const windowB = makeClient();
    expect((await windowB.recover())?.access_token).toBe('rotated-jwt');
    expect((await windowB.recover())?.refresh_token).toBe('rotated-refresh');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('a transient refresh outage preserves the saved session for later retry', async () => {
    const saved = storage();
    saved.setItem(SESSION_STORAGE_KEY, JSON.stringify(token(-3)));
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const windowB = makeClient();
    expect(await windowB.recover()).toBeNull();
    expect(saved.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => json(token())));
    expect((await windowB.recover())?.user.id).toBe(person);
  });

  it('adopts a token freshly rotated by another window instead of clearing it', async () => {
    const saved = storage();
    saved.setItem(SESSION_STORAGE_KEY, JSON.stringify(token(-3)));
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('fetch', vi.fn(async () => {
      saved.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...token(3600), access_token: 'from-other-window' }));
      return json({ error: 'old refresh token' }, 401);
    }));
    const windowA = makeClient();
    expect((await windowA.recover())?.access_token).toBe('from-other-window');
    expect(saved.getItem(SESSION_STORAGE_KEY)).toContain('from-other-window');
  });

  it('migrates an existing sessionStorage login to persistent, shared storage', async () => {
    const saved = storage();
    const legacy = storage();
    legacy.setItem('puzzle-league.session.v1', JSON.stringify(token()));
    vi.stubGlobal('localStorage', saved);
    vi.stubGlobal('sessionStorage', legacy);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('should not need refresh'); }));
    const windowA = makeClient();
    expect((await windowA.recover())?.user.id).toBe(person);
    expect(legacy.getItem('puzzle-league.session.v1')).toBeNull();
    expect(saved.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
  });
});
