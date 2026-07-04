# Decisions

Record of choices made where `CLAUDE.md` / the master prompts left an open decision or offered
alternatives. Update this file whenever such a choice is made or revisited.

## 2026-07-02 — Initial scaffold decisions

- **Monorepo orchestrator:** pnpm workspaces only. No Turborepo/Nx for now — two apps don't yet
  need task-graph caching; revisit if build/test times become painful.
- **Backend framework:** Fastify (not Express, the spec's other default) — built-in schema
  validation and Pino logging fit this stack better, and it matches the repo name.
- **Deployment target:** undecided. Scaffolded with local `.env`/`.env.example` only; no
  platform-specific deploy config or production secrets manager wired yet. Revisit before shipping
  anywhere real.
- **Node LTS line:** 24.x ("Krypton"), Active LTS as of mid-2026.
- **Fastify + Zod + OpenAPI toolchain:** `fastify-zod-openapi` (extends
  `fastify-type-provider-zod`) for validation/serialization _and_ OpenAPI generation from the same
  Zod schemas, `@fastify/swagger` for the raw spec, `@scalar/fastify-api-reference` for the docs UI.
- **Frontend API client generator:** Orval (not `openapi-zod-client`) — better-suited for Vue,
  and its Zod-schema output pairs with Pinia Colada query/mutation generation.
- **First vertical-slice demo feature:** `Tasks` (`title`, `done`, `dueDate`) — simple CRUD used to
  prove the schema → API → OpenAPI → client → UI pipeline end to end.
- **License:** MIT.
- **`packages/schemas` (from CLAUDE.md's suggested layout):** folded into
  `apps/api/src/modules/*/*.schemas.ts` rather than a separate shared package. The frontend never
  imports backend Zod schemas directly — its client is generated from the OpenAPI spec — so a
  shared schemas package would have no consumer today. Revisit if a schema genuinely needs to be
  hand-shared outside the generated-client flow.

## 2026-07-03 — Observability (Slice 5)

- **Fastify instrumentation:** `@fastify/otel` (Fastify-team-maintained), not
  `@opentelemetry/instrumentation-fastify` — the latter was removed upstream (March 2026) in favor
  of `@fastify/otel`. Registered as a normal plugin (`fastifyOtelInstrumentation.plugin()`) rather
  than via its `registerOnInitialization` auto-patch mode, because that mode (like generic
  http/pg auto-instrumentation) relies on Node's require-hook mechanism, which under this
  project's pure-ESM setup needs `--experimental-loader=@opentelemetry/instrumentation/hook.mjs` —
  fragile to stack with `tsx`'s own dev-time loader. Manual plugin registration has no such
  dependency and is verified working (see `apps/api/src/instrumentation.ts`).
- **DB spans:** no `@opentelemetry/instrumentation-pg` wired in, for the same ESM/require-hook
  reason above. Covered instead with manual spans around each `task.service.ts` method
  (`withSpan()`), which is what `observability.md` §3 asks for regardless ("wrap meaningful
  operations in explicit spans"). Add the experimental loader flag to the production `start`
  script if full auto-patched `http`/`pg` spans are wanted later — `getNodeAutoInstrumentations()`
  is already in the SDK config and will pick them up once the loader is present.
- **Frontend browser tracing:** implemented the real `@opentelemetry/sdk-trace-web` +
  `FetchInstrumentation` setup (not a hand-rolled `traceparent` header) specifically to get
  correct W3C Trace Context propagation for free. Kept intentionally minimal — no document-load
  or user-interaction instrumentation — since `observability.md` §4 marks fuller browser tracing
  as optional and Core Web Vitals as the higher-priority item.
- **Frontend Web Vitals sink:** reports to `console.info` for now (clearly the forwarding seam,
  not real telemetry) — there's no metrics-ingestion endpoint or RUM backend wired up yet. Swap
  the `report()` function in `apps/web/src/shared/observability/web-vitals.ts` for a real forward
  (Collector OTLP-over-HTTP-JSON, or an RUM SDK) when one exists.
- Verified end-to-end locally: a browser-originated `traceparent` produces one `trace_id` visible
  in the backend's correlated Pino logs and in the local OTel Collector's `debug` exporter output,
  alongside the manual `tasks.*` spans and the `http.server.request.count`/`.duration` RED metrics.

## 2026-07-04 — Authentication & authorization (stub)

`shared-api-conventions.md` §5 mandates real auth (short-lived tokens via httpOnly cookies +
refresh) plus **server-side object-level ownership**. We implemented the second half for real and
**stubbed the first**, deliberately, to keep the identity system out of scope while still closing
the object-level-authorization gap (the higher-risk one).

- **Stub authentication:** an `onRequest` hook on the Tasks plugin requires a static bearer token
  (`API_AUTH_TOKEN`); a valid token resolves to one hardcoded principal (`DEV_USER_ID`), missing/
  invalid → `401 UNAUTHENTICATED`. The frontend sends the token via `VITE_API_TOKEN` in the
  generated client's HTTP wrapper. This is **not** production auth — see `shared/auth/auth.ts`.
  Replace `registerAuth` with real verification (resolve the user from a verified JWT/session);
  nothing downstream changes, since it only depends on `request.userId`.
- **Real authorization:** every Tasks query is scoped by `request.userId` in the repository. A task
  owned by another user is indistinguishable from a missing one (`404`) — read, update, and delete
  all 404 — which also avoids leaking existence. Added `Task.userId` + an owner-first index
  `@@index([userId, createdAt, id])`.
- **Not documented in OpenAPI yet:** the bearer requirement isn't expressed as an OpenAPI security
  scheme (would be the next step for a real auth story); the contract/DTOs are otherwise unchanged.
