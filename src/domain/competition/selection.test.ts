import { describe, expect, it } from 'vitest';
import { firstAccessibleLeague, initialSeason } from './selection';
import type { League, Season } from './view-model';
const league = (league_id: string, name: string): League => ({ league_id, name, is_owner: false, visibility: 'private', time_zone: 'Africa/Johannesburg' });
const season = (season_id: string, starts_at: string, ends_at: string, state: string): Season => ({ season_id, starts_at, ends_at, state, cadence: 'calendar_month', sequence_no: 1, games: null });
describe('deterministic initial ranking selection', () => {
  it('chooses alphabetically first accessible league regardless of server order', () => {
    expect(firstAccessibleLeague([league('z','Zoo'),league('a','alpha')])).toBe('a');
    expect(firstAccessibleLeague([league('b','Alpha'),league('a','alpha')])).toBe('a');
    expect(firstAccessibleLeague([])).toBeNull();
  });
  it('prefers active started season to future and finished seasons', () => {
    const list = [season('future','2026-11-01','2026-12-01','scheduled'),season('past','2026-08-01','2026-09-01','finished'),season('active','2026-10-01','2026-11-01','active')];
    expect(initialSeason(list, Date.parse('2026-10-23T12:00:00Z'))).toBe('active');
  });
  it('selects latest historical started season rather than upcoming', () => {
    expect(initialSeason([season('one','2026-08-01','2026-09-01','finished'),season('two','2026-09-01','2026-10-01','finished'),season('future','2026-12-01','2027-01-01','scheduled')],Date.parse('2026-10-23'))).toBe('two');
  });
  it('leaves no selection when every season is in the future', () => {
    expect(initialSeason([season('future','2026-12-01','2027-01-01','scheduled')],Date.parse('2026-10-23'))).toBeNull();
  });
});
