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
    test: {
      coverage: {
        exclude: [
          'node_modules/**',
          'dist/**',
          '.next/**',
          '**/*.config.*',
          '**/*.d.ts',
          '**/generated/**',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          'src/scripts/**',
          '**/*.repository.ts',
          '**/*.routes.ts',
          'src/app.ts',
          'src/server.ts',
        ],
      },
    },
  }),
);
