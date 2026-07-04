import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import router from './router'
import { initTracing } from './shared/observability/tracing'
import { installGlobalErrorHandler } from './shared/observability/error-handler'

// Registered before mount (not deferred like Web Vitals below) so even the first API
// call — often fired on initial mount — gets a traceparent header propagated to it.
initTracing()

const app = createApp(App)

installGlobalErrorHandler(app)

app.use(createPinia())
app.use(PiniaColada)
app.use(router)
app.use(ui)

app.mount('#app')

// Lazy-loaded after first paint per observability.md §4's hygiene guidance.
function loadWebVitals(): void {
  void import('./shared/observability/web-vitals').then(({ initWebVitals }) => initWebVitals())
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(loadWebVitals)
} else {
  setTimeout(loadWebVitals, 0)
}
