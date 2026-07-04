import { DEV_USER_ID } from '../src/shared/auth/auth.js';
import { prisma } from '../src/shared/db/prisma.js';

async function main(): Promise<void> {
  // A few sample tasks owned by the stub dev user, so a fresh dev sees data.
  const count = await prisma.task.count({ where: { userId: DEV_USER_ID } });
  if (count > 0) return;

  await prisma.task.createMany({
    data: [
      { userId: DEV_USER_ID, title: 'Read the project README' },
      { userId: DEV_USER_ID, title: 'Explore the API docs at /docs', done: true },
      { userId: DEV_USER_ID, title: 'Ship the interview task' },
    ],
  });
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
