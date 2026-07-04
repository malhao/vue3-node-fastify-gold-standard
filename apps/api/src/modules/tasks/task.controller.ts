import type { FastifyReply, FastifyRequest } from 'fastify';

import { ok } from '../../shared/http/envelope.js';
import { taskService } from './task.service.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas.js';

export const taskController = {
  async list(request: FastifyRequest<{ Querystring: ListTasksQuery }>) {
    return taskService.list(request.userId, request.query);
  },

  async getById(request: FastifyRequest<{ Params: { id: string } }>) {
    return ok(await taskService.getById(request.userId, request.params.id));
  },

  async create(request: FastifyRequest<{ Body: CreateTaskInput }>, reply: FastifyReply) {
    const task = await taskService.create(request.userId, request.body);
    reply.header('Location', `/api/v1/tasks/${task.id}`);
    reply.status(201);
    return ok(task);
  },

  async update(request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskInput }>) {
    return ok(await taskService.update(request.userId, request.params.id, request.body));
  },

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await taskService.remove(request.userId, request.params.id);
    reply.status(204);
  },
};
