import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import {
  BatchSpanProcessor,
  StackContextManager,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web'

import { config } from '../config/env.js'

/** Minimal browser tracing: just enough to propagate `traceparent` on API calls so a
 * browser interaction links to the backend trace (observability.md §4's "high-value bit").
 * Registered synchronously before mount (unlike the deferred Web Vitals module) so even
 * the first API call — often fired on initial mount — gets a traceparent propagated. */
export function initTracing(): void {
  if (!config.VITE_OTEL_EXPORTER_OTLP_ENDPOINT) return

  const provider = new WebTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${config.VITE_OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` }),
      ),
    ],
  })

  provider.register({
    contextManager: new StackContextManager(),
    propagator: new W3CTraceContextPropagator(),
  })

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [new RegExp(`^${config.VITE_API_ORIGIN}`)],
      }),
    ],
  })
}
