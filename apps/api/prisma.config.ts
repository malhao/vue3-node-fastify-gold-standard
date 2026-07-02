import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// The repo's single .env lives at the workspace root, not in this package.
config({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
