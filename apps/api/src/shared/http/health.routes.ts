import type { FastifyInstance } from 'fastify';

import { prisma } from '../db/prisma.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  app.get('/readyz', { schema: { hide: true } }, async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (err) {
      app.log.error({ err }, 'Readiness check failed: database unreachable');
      return reply.status(503).send({ status: 'unavailable' });
    }
  });
}
