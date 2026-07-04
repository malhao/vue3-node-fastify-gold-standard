import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'
import { HttpResponse, delay, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/msw/server'
import { API_ORIGIN } from '../../../test/msw/handlers'
import TaskList from './TaskList.vue'

// Assert error feedback by spying on the toast rather than rendering UApp's teleported
// toast host in jsdom (brittle). Only our mutation code calls useToast, so this is precise.
const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn<(toast: unknown) => void>() }))
vi.mock('@nuxt/ui/composables', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nuxt/ui/composables')>()),
  useToast: () => ({ add: toastAdd, remove: vi.fn<() => void>(), update: vi.fn<() => void>(), clear: vi.fn<() => void>() }),
}))

beforeEach(() => toastAdd.mockClear())

function renderTaskList() {
  return render(TaskList, {
    global: { plugins: [createPinia(), PiniaColada, ui] },
  })
}

const TASK = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Write the report',
  done: false,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const listResponse = (tasks: unknown[]) =>
  HttpResponse.json({
    data: tasks,
    meta: { pagination: { nextCursor: null, hasMore: false, limit: 20 } },
  })

const serverError = () =>
  new HttpResponse(
    JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'Boom', details: [], requestId: 'r1' },
    }),
    { status: 500 },
  )

describe('TaskList', () => {
  it('shows the empty state when there are no tasks', async () => {
    renderTaskList()

    await waitFor(() => {
      expect(screen.getByTestId('tasks-empty')).toBeInTheDocument()
    })
  })

  it('renders tasks returned by the API', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () =>
        HttpResponse.json({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              title: 'Write the report',
              done: false,
              dueDate: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: { pagination: { nextCursor: null, hasMore: false, limit: 20 } },
        }),
      ),
    )

    renderTaskList()

    await waitFor(() => {
      expect(screen.getByText('Write the report')).toBeInTheDocument()
    })
  })

  it('shows an error state when the request fails', async () => {
    server.use(
      http.get(
        `${API_ORIGIN}/api/v1/tasks`,
        () =>
          new HttpResponse(
            JSON.stringify({
              error: { code: 'INTERNAL_ERROR', message: 'Boom', details: [], requestId: 'r1' },
            }),
            { status: 500 },
          ),
      ),
    )

    renderTaskList()

    await waitFor(() => {
      expect(screen.getByTestId('tasks-error')).toBeInTheDocument()
    })
  })

  it('checks the box optimistically before the update request resolves', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])),
      // Never resolves — so a checked box can only come from the optimistic update.
      http.patch(`${API_ORIGIN}/api/v1/tasks/:id`, async () => {
        await delay('infinite')
      }),
    )

    renderTaskList()
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await fireEvent.click(checkbox)

    await waitFor(() => expect(checkbox).toBeChecked())
  })

  it('reverts the checkbox when the update request fails', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])),
      http.patch(`${API_ORIGIN}/api/v1/tasks/:id`, async () => {
        await delay(30)
        return serverError()
      }),
    )

    renderTaskList()
    const checkbox = await screen.findByRole('checkbox')

    // Hang the reconcile refetch so only onError's rollback can revert the box —
    // otherwise a truthful refetch would mask a missing rollback.
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, async () => {
        await delay('infinite')
      }),
    )

    await fireEvent.click(checkbox)

    await waitFor(() => expect(checkbox).toBeChecked()) // optimistic apply
    await waitFor(() => expect(checkbox).not.toBeChecked()) // rolled back on error
  })

  it('removes the row optimistically before the delete request resolves', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])),
      http.delete(`${API_ORIGIN}/api/v1/tasks/:id`, async () => {
        await delay('infinite')
      }),
    )

    renderTaskList()
    await screen.findByText('Write the report')

    await fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() => expect(screen.queryByText('Write the report')).not.toBeInTheDocument())
  })

  it('restores the row when the delete request fails', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])),
      http.delete(`${API_ORIGIN}/api/v1/tasks/:id`, async () => {
        await delay(30)
        return serverError()
      }),
    )

    renderTaskList()
    await screen.findByText('Write the report')

    // Hang the reconcile refetch so only onError's rollback can bring the row back.
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, async () => {
        await delay('infinite')
      }),
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() => expect(screen.queryByText('Write the report')).not.toBeInTheDocument()) // optimistic remove
    await waitFor(() => expect(screen.getByText('Write the report')).toBeInTheDocument()) // restored on error
  })

  it('gives each checkbox an accessible name referencing its task', async () => {
    server.use(http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])))

    renderTaskList()

    expect(await screen.findByRole('checkbox', { name: /write the report/i })).toBeInTheDocument()
  })

  it('shows an error toast when a delete fails', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/tasks`, () => listResponse([{ ...TASK }])),
      http.delete(`${API_ORIGIN}/api/v1/tasks/:id`, () => serverError()),
    )

    renderTaskList()
    await screen.findByText('Write the report')

    await fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/couldn't delete/i) }),
      ),
    )
  })
})
