/**
 * Must be the first thing evaluated (imported as the first line of server.ts) so the
 * SDK is running before anything it instruments is loaded. Vendor-free by construction:
 * everything here is configured via OTEL_* env vars, not code — see docs/master-prompts/observability.md.
 *
 * Note: full auto-instrumentation (http, pg, ...) under ESM formally requires Node's
 * `--experimental-loader=@opentelemetry/instrumentation/hook.mjs` preload alongside this
 * import (see https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md).
 * That loader is stacked here with tsx's own dev-time loader, which is a fragile
 * combination in practice. `@fastify/otel`'s own auto-registration mode has the same
 * ESM caveat, so it's registered as a normal Fastify plugin in app.ts instead (see
 * `fastifyOtelInstrumentation.plugin()` there) — that path doesn't depend on patching
 * module resolution, so route-level spans work in dev regardless of the loader. Add
 * the loader flag to the `start` script in production if you also want auto-patched
 * `http`/`pg` spans.
 */
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const ignoredPaths = new Set(['/healthz', '/readyz']);

// Registered manually as a Fastify plugin in app.ts (not via registerOnInitialization),
// so it works regardless of ESM require-hook/loader availability — see note above.
export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  ignorePaths: (opts: { url: string }) => ignoredPaths.has(opts.url),
});

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => ignoredPaths.has(req.url ?? ''),
      },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    fastifyOtelInstrumentation,
  ],
});

sdk.start();
