import type { App } from 'vue'

/** Last-resort reporter for errors Vue catches (render, watchers, lifecycle). Logs for
 * now — forward to the observability pipeline (RUM/OTel logs) when one is wired up. */
export function reportError(error: unknown, info: string): void {
  console.error('[vue] Unhandled error', { info, error })
}

/** Installs {@link reportError} as Vue's global error handler so caught errors are
 * reported rather than only surfacing as a dev-console warning. */
export function installGlobalErrorHandler(app: App): void {
  app.config.errorHandler = (error, _instance, info) => reportError(error, info)
}
