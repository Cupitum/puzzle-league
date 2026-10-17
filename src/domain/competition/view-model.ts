import { gameCatalog, type GameId } from '../games/catalog';
export type League = { league_id: string; name: string; visibility: 'public' | 'private'; time_zone: string; is_owner: boolean };
export type PublicLeague = { id: string; name: string; visibility: 'public'; time_zone: string };
export type Season = { season_id: string; sequence_no: number; cadence: string; starts_at: string; ends_at: string; state: string; games: { game: GameId; rule_version: string }[] | null };
export type Score = { nickname: string; total: number; rank: number; game?: GameId };
export type Streak = { nickname: string; game: GameId; longest_streak: number };
export type Board = { combined: Score[]; by_game: Score[]; streaks: Streak[] };
export type History = { id: string; game: GameId | null; parse_status: string; review_status: string; submitted_at: string };
export type Review = { request_id: string; submission_id: string; kind: string; game: string; submitted_at: string; raw_text: string; parse_status: string; review_status: string; rationale: string; correction_proposed_text?: string | null };
export type Report = { report_id: string; reason: string; subject_user_id: string | null; created_at: string };
export type Member = { id: string; user_id: string; role: string; joined_at: string };
export function arrayOf<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
export function boardFrom(value: unknown): Board {
  const obj = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { combined: arrayOf<Score>(obj.combined), by_game: arrayOf<Score>(obj.by_game), streaks: arrayOf<Streak>(obj.streaks) };
}
/** Filter only already-awarded entries; rankings never inferred from pending results. */
export function gameScores(board: Board, game: GameId | 'combined'): Score[] {
  return game === 'combined' ? board.combined : board.by_game.filter((score) => score.game === game);
}
export function catalogueName(game: string | null | undefined): string {
  return gameCatalog.find((g) => g.id === game)?.label ?? game ?? 'Unknown game';
}
export function safePreview(raw: string): { status: string; game: string | null; caveat: string } {
  // This is deliberately a display-only header hint. It CANNOT verify identity, mode or scoring.
  const header = raw.trimStart().split(/\r?\n/u)[0] ?? '';
  const game = /^Wordle\s+\d+/iu.test(header) ? 'wordle' :
    /^Minute Cryptic\b/iu.test(header) ? 'minute_cryptic' :
    /^FoxiMax\b/iu.test(header) ? 'foximax' :
    /^Polygonle\b/iu.test(header) ? 'polygonle' :
    /^Krillion\b/iu.test(header) ? 'krillion' : null;
  return { status: game ? 'Possible recognised game' : 'Unrecognised / requires review', game,
    caveat: 'Preview only. The trusted backend re-parses your exact share and verifies eligibility. A game name or puzzle number does not prove its date, daily mode, authenticity or points.' };
}
