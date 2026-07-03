import { randomUUID } from 'node:crypto';

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastify, { type FastifyInstance } from 'fastify';
import {
  fastifyZodOpenApiPlugin,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-zod-openapi';

import { config } from './shared/config/env.js';
import { registerErrorHandler } from './shared/middleware/error-handler.js';
import { registerHealthRoutes } from './shared/http/health.routes.js';
import { loggerOptions } from './shared/logger/index.js';
import { registerOpenApi } from './shared/openapi/register.js';
import { registerTaskRoutes } from './modules/tasks/task.routes.js';

/** Builds (but does not start) the Fastify app — importable by tests without binding a port. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: loggerOptions,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 1 * 1024 * 1024, // 1 MiB — prevents payload-based DoS
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(fastifyZodOpenApiPlugin);

  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  await app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

  registerErrorHandler(app);

  await registerOpenApi(app);
  await registerHealthRoutes(app);
  await app.register(registerTaskRoutes, { prefix: '/api/v1/tasks' });

  return app;
}
