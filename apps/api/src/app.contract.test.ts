import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// App-level tests for cross-cutting response-contract behavior (error envelope on
// not-found / rate-limit, malformed pagination cursor). None of these paths touch the
// DB — the cursor decode throws before any query, and 404/429 never reach Prisma — so
// they run under the fast unit config. Built once because instrumentation.ts starts a
// singleton OTel SDK; per-test rate-limit isolation comes from distinct remoteAddress.
let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import('./app.js');
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('response contract', () => {
  it('returns a 400 enveloped error for a malformed pagination cursor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks?cursor=not-a-real-cursor',
      remoteAddress: '10.0.0.1',
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.requestId).toBeTruthy();
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'cursor' })]),
    );
  });

  it('returns a 404 enveloped error for an unknown route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/does-not-exist',
      remoteAddress: '10.0.0.2',
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });
});
