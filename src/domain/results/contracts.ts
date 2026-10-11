/**
 * Type-only reference vocabulary for future result parsing and scoring adapters.
 * The Python Phase 1 POC remains the authoritative executable research baseline.
 * These types do not parse, approve, authenticate, award, or persist anything.
 */
import type { GameId } from '../games/catalog';

/** Phase 1 parser's structural dispositions, not server acceptance states. */
export type ResearchParseStatus =
  | 'recognized_valid'
  | 'invalid'
  | 'ambiguous'
  | 'needs_review'
  | 'unrecognized';

/** Candidate IDs are not verified daily puzzle identities. */
export type PuzzleIdentityCandidate = Readonly<{
  game: GameId;
  sourceIdentifier: string;
  sourceKind: 'number' | 'reported_date';
  verifiedPuzzleDay: false;
}>;

/** No runtime parser exists in the browser application in Phase 2. */
export type ResearchParseReference = Readonly<{
  game: GameId | null;
  parserVersion: string;
  status: ResearchParseStatus;
  issues: readonly string[];
  scoringEligible: false;
}>;

/** Future scoring adapters must require trusted approval before awarding. */
export type ScoringRuleReference = Readonly<{
  game: GameId;
  ruleVersion: string;
  awardsPoints: false;
}>;
