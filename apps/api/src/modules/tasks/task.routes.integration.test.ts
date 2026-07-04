import type { FastifyInstance } from 'fastify';
import request, { type Test } from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';

const TOKEN = 'itest-token';
const authed = (req: Test): Test => req.set('Authorization', `Bearer ${TOKEN}`);

let app: FastifyInstance;
let prisma: PrismaClient;

beforeAll(async () => {
  // Config/Prisma modules validate env and construct the client at import time,
  // so the DB URL (and auth token) must be set before they're (dynamically) imported.
  process.env['DATABASE_URL'] = inject('databaseUrl');
  process.env['CORS_ORIGIN'] ??= 'http://localhost:5173';
  process.env['API_AUTH_TOKEN'] = TOKEN;

  const { buildApp } = await import('../../app.js');
  ({ prisma } = await import('../../shared/db/prisma.js'));
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Tasks API (integration)', () => {
  it('creates, lists, updates, and deletes a task against a real Postgres', async () => {
    const createRes = await authed(request(app.server).post('/api/v1/tasks'))
      .send({ title: 'Write the report' })
      .expect(201);

    expect(createRes.headers.location).toBe(`/api/v1/tasks/${createRes.body.data.id}`);
    const taskId: string = createRes.body.data.id;
    expect(createRes.body.data).toMatchObject({ title: 'Write the report', done: false });

    const listRes = await authed(request(app.server).get('/api/v1/tasks')).expect(200);
    expect(listRes.body.data.some((t: { id: string }) => t.id === taskId)).toBe(true);

    const getRes = await authed(request(app.server).get(`/api/v1/tasks/${taskId}`)).expect(200);
    expect(getRes.body.data.id).toBe(taskId);

    const updateRes = await authed(request(app.server).patch(`/api/v1/tasks/${taskId}`))
      .send({ done: true })
      .expect(200);
    expect(updateRes.body.data.done).toBe(true);

    await authed(request(app.server).delete(`/api/v1/tasks/${taskId}`)).expect(204);
    await authed(request(app.server).get(`/api/v1/tasks/${taskId}`)).expect(404);
  });

  it('returns a 422 validation error for an invalid payload', async () => {
    const res = await authed(request(app.server).post('/api/v1/tasks'))
      .send({ title: '' })
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'title' })]),
    );
  });

  it("does not expose another user's tasks (object-level authorization)", async () => {
    // A task owned by a different user, inserted directly (bypassing the API).
    const foreign = await prisma.task.create({
      data: { userId: 'someone-else', title: 'Not yours' },
    });

    const listRes = await authed(request(app.server).get('/api/v1/tasks')).expect(200);
    expect(listRes.body.data.some((t: { id: string }) => t.id === foreign.id)).toBe(false);

    // It must be indistinguishable from a missing task — read, update, and delete all 404.
    await authed(request(app.server).get(`/api/v1/tasks/${foreign.id}`)).expect(404);
    await authed(request(app.server).patch(`/api/v1/tasks/${foreign.id}`))
      .send({ done: true })
      .expect(404);
    await authed(request(app.server).delete(`/api/v1/tasks/${foreign.id}`)).expect(404);

    // And it's untouched by the owner's requests.
    expect(await prisma.task.findUnique({ where: { id: foreign.id } })).not.toBeNull();
  });
});
