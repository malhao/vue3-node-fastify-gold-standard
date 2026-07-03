import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    // Unit tests never touch a real DB (Prisma's Pool connects lazily), but importing
    // the repository module still requires config validation to pass at import time.
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/gold_standard_test',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
