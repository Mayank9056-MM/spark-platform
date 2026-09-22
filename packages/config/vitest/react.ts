import react from '@vitejs/plugin-react';
import { mergeConfig, type ViteUserConfig } from 'vitest/config';

import { baseConfig } from './base.ts';

export const reactConfig: ViteUserConfig = mergeConfig(baseConfig, {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['app/**/*.{test,spec}.{ts,tsx}', 'components/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
