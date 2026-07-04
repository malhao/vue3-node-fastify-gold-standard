import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
// Import from the composables entry, NOT '@nuxt/ui' — the package root resolves to the
// Nuxt *module* build (dist/module.mjs), which is not browser-safe and breaks app startup
// when imported as a value. (Type-only imports from '@nuxt/ui' are fine — they're erased.)
import { useToast } from '@nuxt/ui/composables'
import {
  ApiError,
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

/** The API envelope's `message` is client-safe; fall back to a generic line otherwise. */
function errorDescription(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Please try again.'
}

export function useTasksQuery() {
  return useQuery({
    key: TASKS_KEY,
    query: async () => GetApiV1TasksResponse.parse(await getApiV1Tasks({ limit: 50 })),
  })
}

export function useCreateTaskMutation() {
  const queryCache = useQueryCache()
  const toast = useToast()
  return useMutation({
    mutation: async (input: CreateTaskInput) =>
      PostApiV1TasksResponse.parse(await postApiV1Tasks(input)),
    onError(error) {
      toast.add({ title: "Couldn't add the task", description: errorDescription(error), color: 'error' })
    },
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}

export function useUpdateTaskMutation() {
  const queryCache = useQueryCache()
  const toast = useToast()
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
    onError(error, _vars, { previous }) {
      if (previous) queryCache.setQueryData(TASKS_KEY, previous)
      toast.add({ title: "Couldn't update the task", description: errorDescription(error), color: 'error' })
    },
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryCache = useQueryCache()
  const toast = useToast()
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
    onError(error, _id, { previous }) {
      if (previous) queryCache.setQueryData(TASKS_KEY, previous)
      toast.add({ title: "Couldn't delete the task", description: errorDescription(error), color: 'error' })
    },
    onSettled() {
      void queryCache.invalidateQueries({ key: TASKS_KEY })
    },
  })
}
