import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

let app: FastifyInstance;

beforeAll(async () => {
  // Config/Prisma modules validate env and construct the client at import time,
  // so the DB URL must be set before they're (dynamically) imported.
  process.env['DATABASE_URL'] = inject('databaseUrl');
  process.env['CORS_ORIGIN'] ??= 'http://localhost:5173';

  const { buildApp } = await import('../../app.js');
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Tasks API (integration)', () => {
  it('creates, lists, updates, and deletes a task against a real Postgres', async () => {
    const createRes = await request(app.server)
      .post('/api/v1/tasks')
      .send({ title: 'Write the report' })
      .expect(201);

    expect(createRes.headers.location).toBe(`/api/v1/tasks/${createRes.body.data.id}`);
    const taskId: string = createRes.body.data.id;
    expect(createRes.body.data).toMatchObject({ title: 'Write the report', done: false });

    const listRes = await request(app.server).get('/api/v1/tasks').expect(200);
    expect(listRes.body.data.some((t: { id: string }) => t.id === taskId)).toBe(true);

    const getRes = await request(app.server).get(`/api/v1/tasks/${taskId}`).expect(200);
    expect(getRes.body.data.id).toBe(taskId);

    const updateRes = await request(app.server)
      .patch(`/api/v1/tasks/${taskId}`)
      .send({ done: true })
      .expect(200);
    expect(updateRes.body.data.done).toBe(true);

    await request(app.server).delete(`/api/v1/tasks/${taskId}`).expect(204);
    await request(app.server).get(`/api/v1/tasks/${taskId}`).expect(404);
  });

  it('returns a 422 validation error for an invalid payload', async () => {
    const res = await request(app.server).post('/api/v1/tasks').send({ title: '' }).expect(422);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'title' })]),
    );
  });
});
