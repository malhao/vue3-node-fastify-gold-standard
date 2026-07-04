import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  // Vitest `globals` is off, so Testing Library's auto-cleanup (which hooks a
  // global afterEach) doesn't run — unmount rendered components explicitly so
  // they don't bleed into the next test.
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
