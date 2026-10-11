import { describe, expect, it } from 'vitest';
import { resolvePublicStage } from './public-env';

describe('public-only stage configuration', () => {
  it('infers the environment when unset', () => {
    expect(resolvePublicStage(undefined, 'development')).toBe('local');
    expect(resolvePublicStage('', 'test')).toBe('test');
    expect(resolvePublicStage(undefined, 'production')).toBe('production');
  });
  it('accepts documented stage labels', () => {
    expect(resolvePublicStage('test', 'development')).toBe('test');
    expect(resolvePublicStage('production', 'production')).toBe('production');
  });
  it('rejects invalid or misleading production labels', () => {
    expect(() => resolvePublicStage('secret', 'development')).toThrow('Invalid VITE_APP_STAGE');
    expect(() => resolvePublicStage('local', 'production')).toThrow('nonproduction');
  });
});
