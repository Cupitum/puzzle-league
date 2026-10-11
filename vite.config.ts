import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Build-time validation for a *public UI label*, not an access control.
  const stage = loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_STAGE;
  if (stage && !['local', 'test', 'production'].includes(stage)) {
    throw new Error('Invalid VITE_APP_STAGE: expected local, test or production');
  }
  if (mode === 'production' && stage && stage !== 'production') {
    throw new Error('Production Vite build requires VITE_APP_STAGE=production or an empty value');
  }
  return {
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
