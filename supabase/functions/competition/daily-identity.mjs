/** Owner-approved 2026-10-25 local-calendar daily identity rule v1.
 * Source-independent date/number correlation, NOT proof of a player score.
 * Pure helper: the trusted SQL layer independently recomputes before any award.
 */
export const DAILY_IDENTITY_VERSION = 'local_calendar_v1';
export const ANCHOR_DAY = '2026-10-25';
export const ANCHORS = Object.freeze({
  wordle: 1954, foximax: 1520, krillion: 102, polygonle: 1547,
});
const MS_DAY = 86_400_000;
export function calendarOrdinal(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(day)) return null;
  const timestamp = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10) !== day) return null;
  return Math.floor(timestamp/MS_DAY);
}
export function expectedPuzzleId(game, day) {
  const ordinal = calendarOrdinal(day);
  if (ordinal === null) return null;
  if (game === 'minute_cryptic') return day;
  if (!Object.hasOwn(ANCHORS, game)) return null;
  const candidate = ANCHORS[game] + ordinal - calendarOrdinal(ANCHOR_DAY);
  return Number.isSafeInteger(candidate) && candidate > 0 ? String(candidate) : null;
}
// The offset comes from Date#getTimezoneOffset: UTC minutes minus local minutes.
// No account IP guessing, named time-zone database or alternate-day search.
export function serverLocalDay(offsetMinutes, now = Date.now()) {
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < -840 || offsetMinutes > 720 ||
      offsetMinutes % 15 !== 0 || !Number.isFinite(now)) return null;
  return new Date(now - offsetMinutes * 60_000).toISOString().slice(0,10);
}
export function dateIdentityDecision(parsed, localDay, utcOffsetMinutes, now = Date.now()) {
  const pending = (reason) => ({verified:false,status:parsed?.status==='invalid'?'invalid':
    parsed?.status==='ambiguous'?'ambiguous':parsed?.status==='unrecognized'?'unrecognized':'needs_review',
    reason, localDay, expectedKey:null,method:DAILY_IDENTITY_VERSION});
  if (!parsed || !['recognized_valid','needs_review'].includes(parsed.status) || !parsed.identity_key)
    return pending('invalid_or_ambiguous_share');
  if (serverLocalDay(utcOffsetMinutes,now) !== localDay) return pending('invalid_local_calendar_day');
  const expectedKey = expectedPuzzleId(parsed.game,localDay);
  if (expectedKey === null || expectedKey !== parsed.identity_key) return pending('puzzle_not_today');
  const issues = parsed.issues || [];
  // Do not override a parser review caused by unknown trailers, clues or malformed grids.
  const limitedReview = parsed.status === 'recognized_valid' ||
    issues.every(i=>i==='mode_unverified' || i==='puzzle_date_not_verified');
  if (!limitedReview) return pending('format_requires_review');
  const f = parsed.fields || {};
  if (parsed.game === 'wordle' && parsed.status!=='recognized_valid') return pending('wordle_grid_or_trailer');
  if (parsed.game === 'foximax' && f.fraction_denominator !== 8) return pending('foximax_mode');
  if (parsed.game === 'polygonle' && (f.attempt_limit_displayed!==6 || ![6,7,8].includes(f.word_length_observed)))
    return pending('polygonle_mode');
  if (parsed.game === 'krillion' && (!Number.isSafeInteger(f.reported_number) ||
      f.reported_number<0 || f.reported_number>700 || [...(f.symbol_trail_raw||'')].length<7))
    return pending('krillion_mode');
  if (parsed.game === 'minute_cryptic' && f.puzzle_date!==localDay) return pending('minute_cryptic_date');
  return {verified:true,status:'recognized_valid',reason:'local_daily_identifier_matched',
    localDay,expectedKey,method:DAILY_IDENTITY_VERSION};
}
