import { createApp, defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { installGlobalErrorHandler } from './error-handler'

describe('global error handler', () => {
  it('reports errors Vue catches during render instead of letting them escape', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Boom = defineComponent({
      setup() {
        throw new Error('boom')
      },
      render: () => h('div'),
    })

    const app = createApp(Boom)
    installGlobalErrorHandler(app)
    // With the handler installed, Vue routes the error to it rather than rethrowing.
    app.mount(document.createElement('div'))

    expect(spy).toHaveBeenCalled()

    app.unmount()
    spy.mockRestore()
  })
})
