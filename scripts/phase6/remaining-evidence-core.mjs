/** Pure, non-awarding external identity evidence checks.
 * Values in EVIDENCE are human-reviewed research references, NOT trusted DB verification.
 */
import { parseShare, previewPerformance, RULE_VERSIONS } from '../../supabase/functions/competition/parser.mjs';

export const EVIDENCE = Object.freeze({
  wordle: Object.freeze({
    identity: '1946', day: '2026-10-17',
    level: 'independent_third_party_number_date_corroboration',
    sources: Object.freeze([
      'https://www.tomsguide.com/news/what-is-todays-wordle-answer',
      'https://www.wordlegroup.com/boards'
    ])
  }),
  minute_cryptic: Object.freeze({
    identity: '2026-10-17', day: '2026-10-17',
    level: 'official_publisher_day_and_clue_reference',
    clue: 'Fudge: best idea when you have high blood sugar? (8)',
    sources: Object.freeze(['https://www.minutecryptic.com/'])
  }),
  foximax: Object.freeze({
    identity: '1512', day: null,
    level: 'official_daily_and_training_modes_known_number_date_not_confirmed',
    sources: Object.freeze(['https://foximax.com/'])
  })
});

// Clue punctuation and case can be normalised, but never substitute a different clue.
export function normalizeClue(s) {
  return String(s ?? '').trim().replace(/^[“”"]|[“”"](?=\s*\(\d+\)\s*$)/gu, '')
    .replace(/\s+/gu,' ').toLowerCase();
}

export function assessRemainingRow(row) {
  const parsed = parseShare(row.raw_share_text);
  const issues = [];
  const e = EVIDENCE[row.game_id];
  if(!e) issues.push('unsupported_game');
  if (row.review_status !== 'pending') issues.push('not_pending');
  if (Number(row.award_count) !== 0) issues.push('existing_awards');
  if (Number(row.decision_count) !== 0) issues.push('existing_moderation_decisions');
  if (parsed.game !== row.game_id) issues.push('raw_share_game_mismatch');
  if (!e || parsed.identity_key !== e.identity) issues.push('puzzle_identity_unexpected');
  if (!['recognized_valid','needs_review'].includes(parsed.status)) issues.push('parser_not_eligible_for_review');
  if (parsed.game === 'wordle' && parsed.status !== 'recognized_valid') issues.push('wordle_parser_not_clean');
  if (parsed.game === 'minute_cryptic' && parsed.status !== 'recognized_valid') issues.push('minute_cryptic_parser_not_clean');
  if (parsed.game === 'foximax' && parsed.status !== 'needs_review') issues.push('foximax_parser_unexpected');
  if (row.identity_key !== null && row.identity_key !== parsed.identity_key) issues.push('stored_identity_conflict');
  if (parsed.game === 'minute_cryptic' && normalizeClue(parsed.fields?.clue) !== normalizeClue('“'+e.clue.replace(/ \(8\)$/u,'” (8)'))) issues.push('official_clue_not_matched');
  if (parsed.game === 'foximax' && (parsed.fields?.fraction_denominator!==8)) issues.push('foximax_unsupported_variant');
  if (row.puzzle_day != null && e?.day && row.puzzle_day !== e.day) issues.push('stored_day_conflicts_with_evidence');
  // Never set game_puzzles.verification_state, or mark game/season eligibility from this function.
  issues.push('official_daily_mode_and_account_authenticity_not_proven');
  if (row.puzzle_day == null) issues.push('stored_puzzle_day_missing');
  if (row.mode !== 'daily' || row.verification_state !== 'verified') issues.push('database_puzzle_not_verified_daily');
  issues.push('league_membership_season_and_48h_eligibility_not_checked');
  if (Number(row.review_count) > 0) issues.push('existing_moderation_request_must_be_preserved');
  if (!e?.day) issues.push('no_verified_puzzle_date_mapping');
  const preview=previewPerformance(parsed);
  if (preview === null) issues.push('no_approved_score_preview');
  return {
    game: row.game_id, number_or_key:parsed.identity_key,
    raw_parser_status:parsed.status, stored_parser_status:row.parse_status,
    evidence_level: e?.level ?? null, corroborated_day:e?.day ?? null,
    publisher_clue_match: row.game_id==='minute_cryptic' ? !issues.includes('official_clue_not_matched') : null,
    reference_urls: [...(e?.sources ?? [])],
    preview_performance_NOT_AWARD:preview,
    score_rule_version: RULE_VERSIONS[row.game_id]??null,
    review_requests:Number(row.review_count), decisions:Number(row.decision_count), awards:Number(row.award_count),
    issues:[...new Set(issues)],
    decision:'RETAIN_PENDING_NO_AWARD',
    eligible_for_auto_approval:false,
    awarded:false
  };
}
