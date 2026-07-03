import type { FastifyInstance } from 'fastify';
import type { FastifyZodOpenApiSchema, FastifyZodOpenApiTypeProvider } from 'fastify-zod-openapi';

import { taskController } from './task.controller.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskEnvelopeSchema,
  taskIdParamSchema,
  taskListOutputSchema,
  updateTaskSchema,
} from './task.schemas.js';

const json = (schema: object) => ({ content: { 'application/json': { schema } } });

export async function registerTaskRoutes(app: FastifyInstance): Promise<void> {
  const server = app.withTypeProvider<FastifyZodOpenApiTypeProvider>();

  server.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['tasks'],
      summary: 'List tasks',
      querystring: listTasksQuerySchema,
      response: { 200: json(taskListOutputSchema) },
    } satisfies FastifyZodOpenApiSchema,
    handler: taskController.list,
  });

  server.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['tasks'],
      summary: 'Get a task by ID',
      params: taskIdParamSchema,
      response: { 200: json(taskEnvelopeSchema) },
    } satisfies FastifyZodOpenApiSchema,
    handler: taskController.getById,
  });

  server.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['tasks'],
      summary: 'Create a task',
      body: createTaskSchema,
      response: { 201: json(taskEnvelopeSchema) },
    } satisfies FastifyZodOpenApiSchema,
    handler: taskController.create,
  });

  server.route({
    method: 'PATCH',
    url: '/:id',
    schema: {
      tags: ['tasks'],
      summary: 'Update a task',
      params: taskIdParamSchema,
      body: updateTaskSchema,
      response: { 200: json(taskEnvelopeSchema) },
    } satisfies FastifyZodOpenApiSchema,
    handler: taskController.update,
  });

  server.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['tasks'],
      summary: 'Delete a task',
      params: taskIdParamSchema,
      response: { 204: { description: 'Deleted' } },
    } satisfies FastifyZodOpenApiSchema,
    handler: taskController.remove,
  });
}
