import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import {
  GetApiV1TasksResponse,
  PatchApiV1TasksIdBody,
  PatchApiV1TasksIdResponse,
  PostApiV1TasksBody,
  PostApiV1TasksResponse,
  deleteApiV1TasksId,
  getApiV1Tasks,
  patchApiV1TasksId,
  postApiV1Tasks,
} from '@gold-standard/api-client'
import type { z } from 'zod'

type CreateTaskInput = z.infer<typeof PostApiV1TasksBody>
type UpdateTaskInput = z.infer<typeof PatchApiV1TasksIdBody>
type TasksResponse = z.infer<typeof GetApiV1TasksResponse>

const TASKS_KEY = ['tasks']

export function useTasksQuery() {
  return useQuery({
    key: TASKS_KEY,
    query: async () => GetApiV1TasksResponse.parse(await getApiV1Tasks({ limit: 50 })),
  })
}

export function useCreateTaskMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: async (input: CreateTaskInput) =>
      PostApiV1TasksResponse.parse(await postApiV1Tasks(input)),
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}

export function useUpdateTaskMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: async ({ id, ...body }: { id: string } & UpdateTaskInput) =>
      PatchApiV1TasksIdResponse.parse(await patchApiV1TasksId(id, body)),
    // Optimistically patch the task in place so the UI (e.g. the done checkbox)
    // updates instantly instead of waiting on the round-trip + refetch.
    async onMutate({ id, ...body }) {
      await queryCache.cancelQueries({ key: TASKS_KEY })
      const previous = queryCache.getQueryData<TasksResponse>(TASKS_KEY)
      if (previous) {
        queryCache.setQueryData(TASKS_KEY, {
          ...previous,
          data: previous.data.map((task) => (task.id === id ? { ...task, ...body } : task)),
        })
      }
      return { previous }
    },
    onError(_error, _vars, { previous }) {
      if (previous) queryCache.setQueryData(TASKS_KEY, previous)
    },
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: string) => deleteApiV1TasksId(id),
    // Optimistically drop the row so deletion feels immediate.
    async onMutate(id) {
      await queryCache.cancelQueries({ key: TASKS_KEY })
      const previous = queryCache.getQueryData<TasksResponse>(TASKS_KEY)
      if (previous) {
        queryCache.setQueryData(TASKS_KEY, {
          ...previous,
          data: previous.data.filter((task) => task.id !== id),
        })
      }
      return { previous }
    },
    onError(_error, _id, { previous }) {
      if (previous) queryCache.setQueryData(TASKS_KEY, previous)
    },
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}
