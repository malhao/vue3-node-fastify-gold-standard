import { render, screen, waitFor } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/msw/server'
import { API_ORIGIN } from '../../../test/msw/handlers'
import TaskList from './TaskList.vue'

function renderTaskList() {
  return render(TaskList, {
    global: { plugins: [createPinia(), PiniaColada, ui] },
  })
}

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
})
