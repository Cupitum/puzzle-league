/**
 * Polishing D-01: a parser is not a puzzle-date authority.
 * Evaluate only an operator-proven, still-current daily reference from p7_identity_reference.
 * This pure contract never calculates puzzle numbers or assigns points.
 */
export const IDENTITY_CONTRACT_VERSION = 'polishing-evidence-v1';
const games = Object.freeze({
  wordle: { identity: 'published-number', reset: 'publisher-daily', mandatory: [] },
  minute_cryptic: { identity: 'published-date-and-clue', reset: 'publisher-daily', mandatory: ['official_clue'] },
  foximax: { identity: 'published-number-and-original-mode', reset: 'source-verified', mandatory: [] },
  polygonle: { identity: 'published-number-and-standard-pattern', reset: 'local-midnight', mandatory: ['official_pattern'] },
  krillion: { identity: 'published-daily-dive-number', reset: 'source-verified', mandatory: [] },
});
export const GAME_IDENTITY_CONTRACTS = games;
const n = v => String(v ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
const clue = v => n(v).replace(/["“”]/gu,'').toLocaleLowerCase('en');
const validDay = day => typeof day === 'string' && /^\d{4}-\d\d-\d\d$/u.test(day) &&
  !Number.isNaN(Date.parse(`${day}T00:00:00.000Z`)) && new Date(`${day}T00:00:00.000Z`).toISOString().slice(0,10) === day;
export function evaluateEvidence(parsed, reference, now = Date.now()) {
  const deny = reason => ({ verified: false, reason, status: parsed?.status ?? 'invalid', source_kind: null, evidence_version: IDENTITY_CONTRACT_VERSION });
  if (!parsed || !Object.hasOwn(games, parsed.game)) return deny('unsupported_game');
  if (!['recognized_valid','needs_review'].includes(parsed.status) ||
      !parsed.identity_key || typeof parsed.identity_key !== 'string') return deny('invalid_or_ambiguous_share');
  if (!reference || reference.game !== parsed.game || reference.identity_key !== parsed.identity_key)
    return deny('no_independently_verified_reference');
  if (reference.mode !== 'daily' || reference.verification_state !== 'verified' ||
      !validDay(reference.puzzle_day)) return deny('unverified_date_or_mode');
  if (!['official_game','official_archive','independently_crosschecked'].includes(reference.source_kind) ||
      typeof reference.source_url !== 'string' || !/^https:\/\/[^\s/?#]+/u.test(reference.source_url) ||
      typeof reference.evidence_digest !== 'string' || !/^[0-9a-f]{64}$/u.test(reference.evidence_digest))
    return deny('source_provenance_incomplete');
  const until = Date.parse(reference.valid_until);
  const observed = Date.parse(reference.observed_at);
  if (!Number.isFinite(until) || !Number.isFinite(observed) || observed > now + 60_000 ||
      until <= now || until <= observed) return deny('reference_expired_or_clock_conflict');
  // Number/string/date are equality checks only; never derive an official number by progression.
  const f = parsed.fields ?? {};
  if (parsed.game === 'wordle') {
    if (String(f.puzzle_number) !== parsed.identity_key || parsed.status !== 'recognized_valid')
      return deny('wordle_number_or_grid_conflict');
  } else if (parsed.game === 'minute_cryptic') {
    if (parsed.identity_key !== reference.puzzle_day || f.puzzle_date !== reference.puzzle_day ||
        !reference.official_clue || clue(f.clue) !== clue(reference.official_clue))
      return deny('minute_cryptic_official_clue_conflict');
  } else if (parsed.game === 'foximax') {
    if (f.fraction_denominator !== 8 || f.puzzle_number == null ||
        String(f.puzzle_number) !== parsed.identity_key || reference.game_mode !== 'original_8')
      return deny('foximax_nonoriginal_or_number_conflict');
  } else if (parsed.game === 'polygonle') {
    if (f.attempt_limit_displayed !== 6 || ![6,7,8].includes(f.word_length_observed) ||
        String(f.puzzle_number) !== parsed.identity_key ||
        reference.game_mode !== 'standard_6to8' || !reference.official_pattern ||
        n(f.pattern_header_raw) !== n(reference.official_pattern))
      return deny('polygonle_daily_pattern_or_mode_conflict');
  } else if (parsed.game === 'krillion') {
    if (String(f.puzzle_number) !== parsed.identity_key || !Number.isSafeInteger(f.reported_number) ||
      f.reported_number < 0 || f.reported_number > 700 || reference.game_mode !== 'daily_dive' ||
      [...(f.symbol_trail_raw ?? '')].length < 7)
      return deny('krillion_daily_dive_or_score_conflict');
  }
  return { verified: true, reason: 'independent_daily_reference_matched',
    status: 'recognized_valid', evidence_version: IDENTITY_CONTRACT_VERSION,
    puzzle_day: reference.puzzle_day, source_kind: reference.source_kind };
}
