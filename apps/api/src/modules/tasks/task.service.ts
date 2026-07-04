import { NotFoundError } from '../../shared/errors/app-error.js';
import { withSpan } from '../../shared/observability/tracer.js';
import type { Task } from '../../generated/prisma/client.js';
import { taskRepository } from './task.repository.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  TaskOutput,
  UpdateTaskInput,
} from './task.schemas.js';

export interface TaskRepository {
  findMany: typeof taskRepository.findMany;
  findById: typeof taskRepository.findById;
  create: typeof taskRepository.create;
  update: typeof taskRepository.update;
  remove: typeof taskRepository.remove;
}

function toOutput(task: Task): TaskOutput {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

/** Business logic for tasks — framework-agnostic, depends only on the injected repository. */
export function createTaskService(repository: TaskRepository = taskRepository) {
  return {
    list(userId: string, query: ListTasksQuery) {
      return withSpan('tasks.list', async () => {
        const { tasks, hasMore, nextCursor } = await repository.findMany(
          userId,
          query.limit,
          query.cursor,
        );
        return {
          data: tasks.map(toOutput),
          meta: { pagination: { nextCursor, hasMore, limit: query.limit } },
        };
      });
    },

    getById(userId: string, id: string): Promise<TaskOutput> {
      return withSpan('tasks.getById', async () => {
        const task = await repository.findById(userId, id);
        if (!task) throw new NotFoundError(`Task ${id} was not found.`);
        return toOutput(task);
      });
    },

    create(userId: string, input: CreateTaskInput): Promise<TaskOutput> {
      return withSpan('tasks.create', async () => {
        const task = await repository.create(userId, input);
        return toOutput(task);
      });
    },

    update(userId: string, id: string, input: UpdateTaskInput): Promise<TaskOutput> {
      return withSpan('tasks.update', async () => {
        // Ownership check: findById is owner-scoped, so a task owned by someone else
        // is treated as missing and never updated.
        const existing = await repository.findById(userId, id);
        if (!existing) throw new NotFoundError(`Task ${id} was not found.`);
        const task = await repository.update(id, input);
        return toOutput(task);
      });
    },

    remove(userId: string, id: string): Promise<void> {
      return withSpan('tasks.remove', async () => {
        const existing = await repository.findById(userId, id);
        if (!existing) throw new NotFoundError(`Task ${id} was not found.`);
        await repository.remove(id);
      });
    },
  };
}

export const taskService = createTaskService();
