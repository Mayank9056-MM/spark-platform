import { defineConfig, mergeConfig } from 'vitest/config';
import { reactConfig } from '@spark/config/vitest/react';
import path from 'node:path';

export default defineConfig(
  mergeConfig(reactConfig, {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }),
);
