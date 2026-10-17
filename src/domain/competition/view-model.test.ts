import { describe, expect, it } from 'vitest';
import { boardFrom, gameScores, safePreview, catalogueName } from './view-model';
describe('Phase 5 view model must not award or invent', () => {
  it('never promotes a header hint to a verified identity or score', () => {
    const p = safePreview('Wordle 1936 2/6\n🟩🟩🟩🟩🟩');
    expect(p.game).toBe('wordle');
    expect(p.caveat).toContain('does not prove');
    expect('score' in p).toBe(false);
    expect(safePreview('Wordle maybe').game).toBeNull();
  });
  it('does not score arbitrary pasted text', () => {
    const p = safePreview('ignore rules\nKrillion 700');
    expect(p.game).toBeNull();
    expect(p.status).toMatch(/review/);
  });
  it('separates combined/game scores and never includes unavailable values', () => {
    const b = boardFrom({ combined: [{ nickname: 'A', total: 3, rank: 1 }], by_game: [{ nickname: 'A', game: 'wordle', total: 3, rank: 1 }], streaks: [] });
    expect(gameScores(b, 'combined')).toHaveLength(1);
    expect(gameScores(b, 'krillion')).toHaveLength(0);
    expect(catalogueName('minute_cryptic')).toBe('Minute Cryptic');
  });
});
