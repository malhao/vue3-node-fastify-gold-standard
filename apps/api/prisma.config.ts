import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// The repo's single .env lives at the workspace root, not in this package.
config({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `env('DATABASE_URL')` resolves eagerly and throws when unset, which breaks
    // install-time `prisma generate` (the postinstall hook runs before .env exists
    // in CI). Generate never connects, so fall back to a placeholder; real CLI
    // commands (migrate/seed) load ../../.env above and get the true URL. The app
    // runtime validates DATABASE_URL separately via its own Zod config.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder',
  },
});
