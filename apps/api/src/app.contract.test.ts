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

// The Tasks routes require a bearer token (see vitest.config env API_AUTH_TOKEN).
const AUTH = { authorization: 'Bearer test-token' };

describe('response contract', () => {
  it('returns 401 for a Tasks request without a valid bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks',
      remoteAddress: '10.0.0.4',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('returns a 400 enveloped error for a malformed pagination cursor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tasks?cursor=not-a-real-cursor',
      remoteAddress: '10.0.0.1',
      headers: AUTH,
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

  it('returns a 429 enveloped error when the rate limit is exceeded', async () => {
    let limited: Awaited<ReturnType<typeof app.inject>> | undefined;
    // Global limit is 100/min; fire from a dedicated IP until one request is limited.
    for (let i = 0; i < 101; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
        remoteAddress: '10.0.0.3',
      });
      if (res.statusCode === 429) {
        limited = res;
        break;
      }
    }

    expect(limited).toBeDefined();
    const body = limited!.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.requestId).toBeTruthy();
  });
});
