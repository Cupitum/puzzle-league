import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gameCatalog } from './catalog';

const ruleContract = JSON.parse(readFileSync(
  new URL('../research/phase1-approved-local-poc/approved_scoring_rules_v1.json', import.meta.url),
  'utf8',
)) as { rule_versions: Record<string, string>; implementation_scope: string };

describe('Phase 1 catalogue references', () => {
  it('contains exactly five distinct supported games', () => {
    expect(gameCatalog).toHaveLength(5);
    expect(new Set(gameCatalog.map((g) => g.id)).size).toBe(5);
  });
  it('retains exactly the five approved Phase 1 scoring rule version IDs', () => {
    expect(Object.fromEntries(gameCatalog.map((g) => [g.id, g.ruleVersion])))
      .toEqual(ruleContract.rule_versions);
  });
  it('does not imply real awarded scores in its source contract', () => {
    expect(ruleContract.implementation_scope).toContain('no league award');
  });
});
