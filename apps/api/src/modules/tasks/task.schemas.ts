import { z } from 'zod';

export const taskIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'Task ID' }),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .meta({ description: 'Task title', example: 'Write the report' }),
  dueDate: z.iso
    .datetime({ offset: true })
    .nullish()
    .meta({ description: 'Due date, ISO 8601 UTC' }),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    done: z.boolean(),
    dueDate: z.iso.datetime({ offset: true }).nullable(),
  })
  .partial()
  .meta({ description: 'Fields to update; omitted fields are left unchanged' });

export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional().meta({ description: 'Opaque pagination cursor' }),
});

export const taskOutputSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  done: z.boolean(),
  dueDate: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const taskListOutputSchema = z.object({
  data: z.array(taskOutputSchema),
  meta: z.object({
    pagination: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
      limit: z.number(),
    }),
  }),
});

export const taskEnvelopeSchema = z.object({
  data: taskOutputSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskOutput = z.infer<typeof taskOutputSchema>;
