import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompetitionClient, ApiError } from './client';
const origin = 'http://127.0.0.1:54321';
const session = { access_token: 'jwt-demo-public-test', refresh_token: 'refresh-demo', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); });
describe('HTTP-only Phase 4 action transport', () => {
  it('never sends an actor ID or calculates awards when submitting a share', async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('sessionStorage', { setItem: vi.fn(), removeItem: vi.fn(), getItem: vi.fn(() => null) });
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      if (url.includes('/auth/v1/token')) return response(session);
      return response({ ok: true, result: { submission_id: 'result-1', duplicate: false, awarded: 0, review_required: true } });
    }));
    const api = new CompetitionClient({ url: origin, key: 'local-anon-public-key' });
    await api.authenticate('p@example.invalid', 'password123', false);
    const r = await api.call('submit', { raw_text: 'Wordle 2000 2/6\n🟩🟩🟩🟩🟩', method: 'paste' }) as { awarded: number };
    expect(r.awarded).toBe(0);
    const request = requests.find(x => x.url.endsWith('/functions/v1/competition'));
    const data = JSON.parse(String(request?.init.body)) as Record<string, unknown>;
    expect(data.action).toBe('submit');
    expect(data).not.toHaveProperty('p_actor');
    expect(data.data).not.toHaveProperty('performance_points');
    expect(request?.init.headers).toMatchObject({ authorization: `Bearer ${session.access_token}` });
  });
  it('permits anonymous public season standings with no JWT', async () => {
    const hits: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => { hits.push(init); return response({ ok: true, result: { combined: [], by_game: [], streaks: [] } }); }));
    const api = new CompetitionClient({ url: origin, key: 'anon-public' });
    await api.call('standings', { season_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    expect(hits[0]?.headers).not.toHaveProperty('authorization');
    await expect(api.call('review_queue')).rejects.toBeInstanceOf(ApiError);
  });
  it('does not interpret error replies as successful awards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Forbidden' }, 403)));
    const api = new CompetitionClient({ url: origin, key: 'anon-public' });
    await expect(api.call('standings', { season_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })).rejects.toThrow('Permission denied');
  });
});
