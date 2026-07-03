import { prisma } from '../../shared/db/prisma.js';
import type { Task } from '../../generated/prisma/client.js';
import type { CreateTaskInput, UpdateTaskInput } from './task.schemas.js';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(task: Pick<Task, 'id' | 'createdAt'>): string {
  const cursor: Cursor = { createdAt: task.createdAt.toISOString(), id: task.id };
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string): Cursor {
  const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('createdAt' in parsed) ||
    !('id' in parsed)
  ) {
    throw new Error('Malformed pagination cursor');
  }
  return parsed as Cursor;
}

export const taskRepository = {
  async findMany(
    limit: number,
    cursor?: string,
  ): Promise<{ tasks: Task[]; hasMore: boolean; nextCursor: string | null }> {
    const decoded = cursor ? decodeCursor(cursor) : null;

    const tasks = await prisma.task.findMany({
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(decoded && {
        where: {
          OR: [
            { createdAt: { gt: new Date(decoded.createdAt) } },
            { createdAt: new Date(decoded.createdAt), id: { gt: decoded.id } },
          ],
        },
      }),
    });

    const hasMore = tasks.length > limit;
    const page = hasMore ? tasks.slice(0, limit) : tasks;
    const last = page.at(-1);

    return {
      tasks: page,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    };
  },

  findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  },

  create(input: CreateTaskInput): Promise<Task> {
    return prisma.task.create({
      data: {
        title: input.title,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });
  },

  update(id: string, input: UpdateTaskInput): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.done !== undefined && { done: input.done }),
        ...(input.dueDate !== undefined && {
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        }),
      },
    });
  },

  async remove(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  },
};
