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
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: string) => deleteApiV1TasksId(id),
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}
