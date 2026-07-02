import { prisma } from '../src/shared/db/prisma.js';

async function main(): Promise<void> {
  // Seed data is added per-feature as modules land (e.g. a handful of sample tasks).
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
