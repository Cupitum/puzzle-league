import type { League, Season } from './view-model';

/** Stable initial choice; never reveal or synthesize inaccessible leagues. */
export function firstAccessibleLeague(leagues: readonly League[]): string | null {
  return [...leagues].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
    a.league_id.localeCompare(b.league_id))[0]?.league_id ?? null;
}

/** Selection only: season state is never interpreted as permission to award points. */
export function initialSeason(seasons: readonly Season[], now: number): string | null {
  const started = seasons.filter(s => Number.isFinite(Date.parse(s.starts_at)) &&
    Date.parse(s.starts_at) <= now);
  const active = started.filter(s => s.state === 'active' &&
    Number.isFinite(Date.parse(s.ends_at)) && Date.parse(s.ends_at) > now);
  const ordered = (active.length ? active : started.filter(s => s.state !== 'scheduled' && s.state !== 'upcoming'))
    .sort((a,b) => Date.parse(b.starts_at)-Date.parse(a.starts_at) ||
      a.season_id.localeCompare(b.season_id));
  return ordered[0]?.season_id ?? null;
}
