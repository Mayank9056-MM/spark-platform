import { mergeConfig, type ViteUserConfig } from 'vitest/config';

import { baseConfig } from './base.ts';

export const nodeConfig: ViteUserConfig = mergeConfig(baseConfig, {
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
