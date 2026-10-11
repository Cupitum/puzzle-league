/**
 * Approved Phase 1 identifiers, NOT a submission or scoring implementation.
 * Cross-checked against research/phase1-approved-local-poc/approved_scoring_rules_v1.json.
 */
export const gameCatalog = [
  { id: 'wordle', label: 'Wordle', ruleVersion: 'wordle-fixed-v1-approved' },
  { id: 'minute_cryptic', label: 'Minute Cryptic', ruleVersion: 'minute-cryptic-hints-v1-approved' },
  { id: 'foximax', label: 'FoxiMax', ruleVersion: 'foximax-original-n8-v1-approved' },
  { id: 'polygonle', label: 'Polygonle', ruleVersion: 'polygonle-standard-v1-approved' },
  { id: 'krillion', label: 'Krillion', ruleVersion: 'krillion-daily-absolute700-v1-approved' },
] as const;

export type GameId = (typeof gameCatalog)[number]['id'];
