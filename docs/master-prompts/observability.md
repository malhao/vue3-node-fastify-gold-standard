# Observability & Logging (Vendor-Neutral)

The cross-cutting standard for logs, metrics, and traces across the backend and frontends. Referenced by all three master prompts. The goal: **instrument once with OpenTelemetry, decide the backend vendor later.** Nothing here names a paid vendor — the seam that lets you plug one in (or self-host) is the OpenTelemetry Collector.

## 0. Principles

- **Vendor-neutral by construction.** Instrument with **OpenTelemetry (OTel)** — a CNCF-graduated, vendor-agnostic standard. Emit over **OTLP** (the OTel wire protocol) to an **OpenTelemetry Collector**. The Collector fans data out to whatever backend you choose later (self-hosted Jaeger/Tempo/Prometheus/Grafana/Loki, or a SaaS). **Swapping vendors is a Collector config change, not an application change.**
- **Configure via `OTEL_*` env vars, not code.** Service identity, endpoint, sampling, and exporters are set through standard env vars (`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_EXPORTER`, `OTEL_RESOURCE_ATTRIBUTES=service.name=…,deployment.environment=…`). App code stays vendor-free.
- **Three pillars, one correlation id.** Logs, metrics, and traces must share a trace/span id so you can pivot between them for one request (see §6).
- **Proportionality.** A small service needs structured logs + health checks + basic RED metrics. Full distributed tracing, RUM, and SLOs are for systems where the complexity earns them. Don't instrument everything blindly — instrument to answer specific questions.
- **Privacy & cost.** Telemetry can capture PII — redact it. High-cardinality attributes and un-sampled high-traffic traces get expensive; sample deliberately and cap cardinality.

## 1. The Vendor-Neutral Seam

```
Backend (Node) ─┐
Nuxt/Nitro     ─┼─ OTLP ─▶ OpenTelemetry Collector ─▶ [ backend TBD ]
Browser (SPA)  ─┘          (batching, sampling,        traces  → Jaeger/Tempo/SaaS
                            attribute redaction,        metrics → Prometheus/SaaS
                            multi-export)               logs    → Loki/SaaS
```

- The **Collector** is the one place that knows about your vendor. Point apps at it via `OTEL_EXPORTER_OTLP_ENDPOINT`; do redaction/sampling/tail-sampling there.
- Run a Collector in every environment (local Docker → prod). This keeps app config identical across environments and makes the "pick a vendor" decision a day-2 concern.

## 2. Signals & Current Maturity (JavaScript)

- **Traces — stable.** Use fully.
- **Metrics — stable.** Use fully.
- **Logs — still evolving in the JS SDK.** Do **not** depend on the OTel logs SDK yet. Keep application logs on **Pino** (structured JSON) and **correlate** them by injecting the active `trace_id`/`span_id` into every log line. Ship those logs to the Collector/agent separately.
- **Error tracking** is not a fourth pillar: record exceptions on spans (`span.recordException(err)` + error status) and forward to an error backend of your choice (any OTLP- or Sentry-compatible sink) — pluggable later, like everything else.

## 3. Backend (Node) Instrumentation

- **SDK:** `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` (auto-spans for `http`, Express/Fastify, `pg`/Prisma, Redis, etc.) + OTLP exporters (`exporter-trace-otlp-http`, `exporter-metrics-otlp-http`) + `@opentelemetry/resources` + `@opentelemetry/semantic-conventions`.
- **Init before app code.** The SDK must load before anything it instruments — preload an `instrumentation.ts` via `node --import ./instrumentation.js` (Node 20+) or `NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"`. Late init = no-op tracers.
- **Manual spans for business logic.** Auto-instrumentation sees HTTP + DB calls but not domain steps; wrap meaningful operations (e.g. "reserve inventory", "charge payment") in explicit spans with attributes.
- **Metrics:** expose RED (Rate, Errors, Duration) per endpoint via the OTel metrics API; add business counters/histograms as needed.
- **Log correlation:** configure Pino to include `trace_id`/`span_id` from the active context on every line (redact secrets/PII per the backend prompt). One request → correlated logs + spans + metrics.
- **Exclude noise:** don't create spans for `/healthz`/`/readyz`.

## 4. Frontend (Browser) Instrumentation

Browser OTel is **experimental and only partly specified** — be pragmatic and lightweight.

- **Core Web Vitals (do this first):** capture **LCP, INP, CLS** (INP replaced FID) with the `web-vitals` library and export them as OTel metrics/spans. Track at the **p75** field percentile; targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. FCP/TTFB are useful diagnostics.
- **Browser tracing (optional):** `@opentelemetry/sdk-trace-web` with `instrumentation-document-load`, `instrumentation-fetch`, and `instrumentation-user-interaction`.
- **The high-value bit — trace propagation:** configure the fetch/XHR instrumentation with `propagateTraceHeaderCorsUrls` so the browser injects `traceparent` on API calls. This links a browser interaction to the backend trace end-to-end — a slow page can be traced from paint → API → DB. Coordinate the allowed API origins with CORS.
- **Client error tracking:** capture `window.onerror`/`unhandledrejection` (and framework error handlers) and forward to your error backend.
- **RUM option:** hand-rolled OTel browser instrumentation works, but a turnkey OTel-compatible RUM SDK (e.g. Grafana Faro) gives aggregated Web Vitals + custom telemetry with less code — still vendor-neutral at the OTLP layer.
- **Hygiene:** lazy-load the telemetry SDK after first paint, sample high-traffic clients, and never capture PII (mind session-replay privacy rules).

## 5. Nuxt / Nitro Specifics

- **Server (Nitro):** it's a Node runtime, so the §3 approach applies — **but OTel must be initialized in a Nitro plugin** (`server/plugins/instrumentation.ts`) or a module that rewrites the entrypoint, **not** in `nuxt.config` hooks (too late). Community modules exist (`@scayle/nuxt-opentelemetry`, `nitro-opentelemetry`, `@hannoeru/nuxt-otel`); first-class Nitro OTel is on the roadmap. Configure via `NUXT_OPENTELEMETRY_*` / `OTEL_*` env vars, and blocklist health-check paths from span creation.
- **Client:** same as §4 (Web Vitals + optional browser tracing + `traceparent` propagation to the BFF).
- **End-to-end trace:** browser → Nitro BFF → upstream Node/Prisma API all share one trace when propagation is wired through each hop.

## 6. Correlation & Trace Propagation (the contract tie-in)

- Propagate context with **W3C Trace Context** (`traceparent`/`tracestate`) plus **baggage** across every hop. This supersedes ad-hoc correlation headers.
- The `x-request-id` in `shared-api-conventions.md` is retained as a human-facing reference and, where present, is derived from / mapped to the `trace_id` so a support ticket ("Reference: …") resolves to a full trace. **That document's Correlation section is the authoritative contract; this section is how it's implemented.**

## 7. Metrics That Matter

- **Services:** RED — request **R**ate, **E**rror rate, **D**uration (latency histogram, watch p95/p99).
- **Resources:** USE — **U**tilization, **S**aturation, **E**rrors (CPU, memory, pool saturation, event-loop lag).
- **Business:** the few counters that reflect product health (signups, orders, checkout success).
- **Frontend:** the three Core Web Vitals at p75, segmented by device/route.

## 8. SLOs & Alerting

- Define a handful of **SLIs** (e.g. availability, p99 latency) and **SLOs** with error budgets. Alert on **symptoms / SLO burn**, not every cause — page on user-visible degradation, dashboard the rest.
- Route alerts to on-call with actionable context (the trace, the release, the request id).

## 9. Logs

- Structured JSON everywhere (Pino on the backend/Nitro); never `console.log` in app code. Levels per environment (`debug` local, `info`/`warn` prod).
- Write to stdout; let the platform/agent/Collector ship to the aggregator. Redact secrets/PII at the source. Correlate with `trace_id`/`span_id` (§2, §6).

## 10. Audit Logging (distinct from app logs)

- Keep a **separate, tamper-evident audit trail** for security-relevant events: authentication, authorization/permission changes, and sensitive data access or mutation — recording who, what, when, and the request/trace id.
- Audit logs have different retention, access-control, and integrity requirements than operational logs; don't conflate the two streams.

## 11. Health & Synthetic Monitoring

- Liveness/readiness endpoints (`/healthz`, `/readyz`) already defined in the backend prompt serve orchestrators and load balancers; exclude them from tracing.
- Add external **uptime/synthetic checks** for critical user journeys from outside your infrastructure — they catch what in-cluster health checks can't (DNS, TLS, CDN, region outages).

## 12. Operational Hygiene

- **Sample** in production (e.g. tail-sampling at the Collector) to control cost while keeping error/slow traces.
- **Cap cardinality** — avoid unbounded attribute values (raw user ids, full URLs with ids) as metric/label dimensions.
- **Mind overhead** — telemetry must not degrade the thing it measures; lazy-load frontend SDKs, batch exports.
- **Keep instrumentation vendor-free** — if a vendor name appears anywhere but the Collector config and `OTEL_*`/deployment env, that's coupling to remove.
