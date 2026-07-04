import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/msw/server'
import { API_ORIGIN } from '../../../test/msw/handlers'
import TaskForm from './TaskForm.vue'

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn<(toast: unknown) => void>() }))
vi.mock('@nuxt/ui/composables', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nuxt/ui/composables')>()),
  useToast: () => ({ add: toastAdd, remove: vi.fn<() => void>(), update: vi.fn<() => void>(), clear: vi.fn<() => void>() }),
}))

beforeEach(() => toastAdd.mockClear())

function renderTaskForm() {
  return render(TaskForm, {
    global: { plugins: [createPinia(), PiniaColada, ui] },
  })
}

describe('TaskForm', () => {
  it('gives the title input an accessible name', () => {
    renderTaskForm()
    expect(screen.getByRole('textbox', { name: /task title/i })).toBeInTheDocument()
  })

  it('shows an error toast when creating a task fails', async () => {
    server.use(
      http.post(
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

    renderTaskForm()
    await fireEvent.update(screen.getByRole('textbox'), 'Write the report')
    await fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/couldn't add/i) }),
      ),
    )
  })
})
