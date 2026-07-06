import { defineConfig, mergeConfig } from 'vitest/config';
import { nodeConfig } from '@spark/config/vitest/node';
import path from 'node:path';

export default defineConfig(
  mergeConfig(nodeConfig, {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }),
);
