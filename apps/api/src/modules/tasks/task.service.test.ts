import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../shared/errors/app-error.js';
import type { Task } from '../../generated/prisma/client.js';
import { createTaskService, type TaskRepository } from './task.service.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    userId: 'user-1',
    title: 'Write the report',
    done: false,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeFakeRepository(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    findMany: vi.fn().mockResolvedValue({ tasks: [], hasMore: false, nextCursor: null }),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(makeTask()),
    update: vi.fn().mockResolvedValue(makeTask()),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const USER = 'user-1';

describe('task.service', () => {
  it('list() maps tasks and pagination meta', async () => {
    const repository = makeFakeRepository({
      findMany: vi
        .fn()
        .mockResolvedValue({ tasks: [makeTask()], hasMore: true, nextCursor: 'abc' }),
    });
    const service = createTaskService(repository);

    const result = await service.list(USER, { limit: 20 });

    expect(repository.findMany).toHaveBeenCalledWith(USER, 20, undefined);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'task-1', title: 'Write the report' });
    expect(result.meta.pagination).toEqual({ nextCursor: 'abc', hasMore: true, limit: 20 });
  });

  it('getById() throws NotFoundError when the task does not exist', async () => {
    const repository = makeFakeRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTaskService(repository);

    await expect(service.getById(USER, 'missing')).rejects.toThrow(NotFoundError);
    expect(repository.findById).toHaveBeenCalledWith(USER, 'missing');
  });

  it('getById() returns the mapped task when found', async () => {
    const repository = makeFakeRepository({ findById: vi.fn().mockResolvedValue(makeTask()) });
    const service = createTaskService(repository);

    await expect(service.getById(USER, 'task-1')).resolves.toMatchObject({ id: 'task-1' });
  });

  it('create() delegates to the repository with the owner and maps the result', async () => {
    const repository = makeFakeRepository({ create: vi.fn().mockResolvedValue(makeTask()) });
    const service = createTaskService(repository);

    const result = await service.create(USER, { title: 'Write the report' });

    expect(repository.create).toHaveBeenCalledWith(USER, { title: 'Write the report' });
    expect(result).toMatchObject({ title: 'Write the report', done: false });
  });

  it('update() throws NotFoundError when the task does not exist', async () => {
    const repository = makeFakeRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTaskService(repository);

    await expect(service.update(USER, 'missing', { done: true })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('update() updates and returns the mapped task when found', async () => {
    const repository = makeFakeRepository({
      findById: vi.fn().mockResolvedValue(makeTask()),
      update: vi.fn().mockResolvedValue(makeTask({ done: true })),
    });
    const service = createTaskService(repository);

    const result = await service.update(USER, 'task-1', { done: true });

    expect(repository.findById).toHaveBeenCalledWith(USER, 'task-1');
    expect(repository.update).toHaveBeenCalledWith('task-1', { done: true });
    expect(result.done).toBe(true);
  });

  it('remove() throws NotFoundError when the task does not exist', async () => {
    const repository = makeFakeRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTaskService(repository);

    await expect(service.remove(USER, 'missing')).rejects.toThrow(NotFoundError);
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('remove() removes the task when found', async () => {
    const repository = makeFakeRepository({ findById: vi.fn().mockResolvedValue(makeTask()) });
    const service = createTaskService(repository);

    await service.remove(USER, 'task-1');

    expect(repository.remove).toHaveBeenCalledWith('task-1');
  });
});
