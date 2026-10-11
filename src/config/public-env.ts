/** Browser-visible environment label only: never use this for access control. */
export type PublicStage = 'local' | 'test' | 'production';

export function resolvePublicStage(value: string | undefined, viteMode: string): PublicStage {
  const inferred: PublicStage = viteMode === 'production'
    ? 'production'
    : viteMode === 'test' ? 'test' : 'local';

  if (value === undefined || value === '') return inferred;
  if (value !== 'local' && value !== 'test' && value !== 'production') {
    throw new Error('Invalid VITE_APP_STAGE: expected local, test or production');
  }
  if (viteMode === 'production' && value !== 'production') {
    throw new Error('Production Vite build cannot use a nonproduction VITE_APP_STAGE');
  }
  return value;
}

export const publicConfig = Object.freeze({
  stage: resolvePublicStage(import.meta.env.VITE_APP_STAGE, import.meta.env.MODE),
});
