import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./test/global-setup.ts'],
    // Container startup + migrations take longer than unit test defaults.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
