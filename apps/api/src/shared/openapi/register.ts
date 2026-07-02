import fastifySwagger from '@fastify/swagger';
import fastifyApiReference from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';
import { fastifyZodOpenApiTransformers } from 'fastify-zod-openapi';

/** Serves the OpenAPI doc generated from the same Zod schemas used for validation:
 * raw spec at `/openapi.json`, interactive Scalar UI at `/docs` — see nodejs-master-prompt §8. */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Gold Standard API',
        version: '1.0.0',
      },
      openapi: '3.1.0',
    },
    ...fastifyZodOpenApiTransformers,
  });

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  await app.register(fastifyApiReference, {
    routePrefix: '/docs',
    configuration: { url: '/openapi.json' },
  });
}
