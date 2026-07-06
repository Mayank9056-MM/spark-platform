import type { ViteUserConfig } from 'vitest/config';

export const baseConfig: ViteUserConfig = {
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    passWithNoTests: true,
    reporters: process.env.CI ? ['dot', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
      reporter: process.env.CI ? ['text', 'lcov'] : ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/generated/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
};
