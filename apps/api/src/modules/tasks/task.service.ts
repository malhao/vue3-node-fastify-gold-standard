import { NotFoundError } from '../../shared/errors/app-error.js';
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
    async list(query: ListTasksQuery) {
      const { tasks, hasMore, nextCursor } = await repository.findMany(query.limit, query.cursor);
      return {
        data: tasks.map(toOutput),
        meta: { pagination: { nextCursor, hasMore, limit: query.limit } },
      };
    },

    async getById(id: string): Promise<TaskOutput> {
      const task = await repository.findById(id);
      if (!task) throw new NotFoundError(`Task ${id} was not found.`);
      return toOutput(task);
    },

    async create(input: CreateTaskInput): Promise<TaskOutput> {
      const task = await repository.create(input);
      return toOutput(task);
    },

    async update(id: string, input: UpdateTaskInput): Promise<TaskOutput> {
      const existing = await repository.findById(id);
      if (!existing) throw new NotFoundError(`Task ${id} was not found.`);
      const task = await repository.update(id, input);
      return toOutput(task);
    },

    async remove(id: string): Promise<void> {
      const existing = await repository.findById(id);
      if (!existing) throw new NotFoundError(`Task ${id} was not found.`);
      await repository.remove(id);
    },
  };
}

export const taskService = createTaskService();
