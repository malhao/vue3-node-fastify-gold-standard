# Master Prompt: Gold-Standard Nuxt 4 Application

**Role:** Senior Full-Stack Nuxt Architect and Vue Engineer.
**Goal:** Build a secure, scalable, highly testable, and maintainable Nuxt application. Companion to the gold-standard Node.js/Prisma backend and the Vue 3 SPA prompt — shared libraries and conventions are kept deliberately aligned (Zod, Pinia + Pinia Colada, Nuxt UI v4+, Vitest, pnpm, ESLint flat config + Prettier).

> **API contract:** the interface with the backend — response envelope, error codes, pagination, auth, versioning, correlation IDs — lives in the separate `shared-api-conventions.md`. Treat it as authoritative wherever this app touches the network boundary. How it applies depends on the deployment shape chosen in §0.

## 0. How to Apply This Prompt (Scope, Shape & Proportionality)

- **When Nuxt at all:** choose Nuxt over the plain Vite SPA when you need SSR/SSG, SEO, file-based routing, edge rendering, or a server layer. For an authenticated internal dashboard with no SEO needs, the SPA prompt is the simpler, correct choice — don't adopt Nuxt reflexively.
- **Deployment shape (decide first — it colors everything):**
  - **(A) Presentation + BFF (default for this stack):** Nuxt renders the UI and its Nitro `server/` layer acts as a **backend-for-frontend** in front of the existing Node/Prisma API. The BFF holds the session/auth token server-side (httpOnly cookie), does SSR data fetching, aggregates/proxies upstream calls, and never exposes upstream secrets to the browser. Here the backend remains the authoritative implementer of `shared-api-conventions.md`; the BFF conforms to it as a client and may re-expose a trimmed surface to its own frontend.
  - **(B) Full-stack Nuxt:** Nitro `server/api` routes _are_ the API (optionally with Prisma directly). Choose this only if you are **not** running the separate Node backend. In that case this app implements `shared-api-conventions.md` directly, and the backend prompt's rules (centralized errors, auth/authz, raw-SQL safety, structured logging) apply to the `server/` layer.
- Scale rigor to the task; state assumptions inline; prefer official Nuxt modules over bespoke wiring.
- **Version:** target **Nuxt 4** (current stable; `nuxt@^4`). Do not chase Nuxt 5 / Nitro v3 nightly in production — note it's on the horizon and keep upgrades in mind, but pin to stable.

## 1. Tech Stack

- **Framework:** Nuxt 4 (`nuxt@^4`), Vue 3 + Composition API with `<script setup lang="ts">`. Vite (Rolldown) + Nitro under the hood — don't hand-configure either beyond `nuxt.config.ts`.
- **Package manager:** pnpm.
- **Language:** TypeScript, strict. Type-check with `nuxt typecheck` (`vue-tsc`), which respects Nuxt's per-context tsconfigs (app / server / shared).
- **UI:** **Nuxt UI v4+** (`@nuxt/ui@^4`) as a **Nuxt module** (add to `modules`, not the Vite-plugin path used for standalone Vue). Tailwind CSS v4, built on Reka UI, auto-imported, WAI-ARIA compliant.
- **State (client):** Pinia via `@pinia/nuxt` (setup-style stores).
- **State (server cache):** Pinia Colada via `@pinia/colada-nuxt` — see §3 for how it coexists with Nuxt's built-in data fetching.
- **Validation & schemas:** Zod, placed in `shared/` so the same schema validates on both the Nitro server and the client (see §4).
- **Forms:** Nuxt UI's `<UForm :schema>` with a Zod schema (Standard Schema — no separate form library; do not add VeeValidate on top of Nuxt UI).
- **Quality & testing modules:** `@nuxt/eslint` (project-aware flat config), `@nuxt/test-utils` (Vitest), Playwright for E2E, `@nuxt/image` for images.

## 2. Architecture & Directory Structure (Nuxt 4)

Nuxt 4 puts app code in `app/`, server code in `server/`, and shared code in `shared/`. Keep `pages/` thin (routing only); push logic into composables/stores; keep the network/DTO contract in `shared/`.

```
/app                       # srcDir; ~ alias points here
  /components              # UI components (auto-imported)
  /composables            # useX logic (auto-imported)
  /layouts
  /middleware             # route middleware (auth guards, etc.)
  /pages                  # file-based routes — thin; delegate to composables/stores
  /plugins
  /stores                 # Pinia stores (client state), grouped by feature
  /utils
  app.vue
  app.config.ts           # non-sensitive, build-time public config (theme, title)
/server                    # Nitro
  /api                    # server routes / BFF endpoints (h3 event handlers)
  /middleware             # server middleware (runs on every request)
  /plugins                # Nitro plugins
  /utils                  # server-only helpers (auto-imported), e.g. upstream API client
/shared                    # shared between app AND server; auto-imports for shared/utils, shared/types
  /schemas                # Zod schemas (single source of truth for validation + types)
  /types
/modules                   # local Nuxt modules
/layers                    # Nuxt Layers for large feature/domain modularization
/public
nuxt.config.ts
```

- **Feature modularity:** for large apps, use **Nuxt Layers** to encapsulate a feature/domain (its own pages, components, composables, server routes, config) and compose them. For smaller apps, group by feature within `components/`, `composables/`, and `stores/` and keep pages thin.
- **`shared/` is the contract home:** put Zod schemas and DTO types here so a server route and a client form validate against the _same_ definition — genuine full-stack type + validation safety.

## 3. Data Fetching & State

Nuxt ships isomorphic data fetching; use the right tool per case rather than reaching for one hammer.

- **`useFetch` / `useAsyncData`:** the default for **page/route initial data**. They run on the server, serialize into the payload (via `devalue`), and hydrate on the client — avoiding the double-fetch/hydration issues that raw `$fetch` in `setup` causes. `await` them to block navigation until data resolves; use `lazy`/`useLazyAsyncData` when you'd rather render and show a loading state.
- **`$fetch` (ofetch, auto-imported):** for **client-side, event-driven** calls only (button clicks, mutations) — it has no dedup/navigation-blocking. In `server/`, `$fetch` calls upstream APIs.
- **Pinia Colada (`@pinia/colada-nuxt`):** use when you want a real **server-state cache** — deduplication, background revalidation, `staleTime`, optimistic mutations, and cross-component sharing beyond what the built-ins give. Its Nuxt module handles SSR via `onServerPrefetch` (no explicit `await` needed) and clears the cache per render so entries don't leak across requests. Rule of thumb: built-ins for simple one-shot page data; Pinia Colada once you have shared, cached, mutated server state.
- **Pinia (`@pinia/nuxt`):** client/UI state only (preferences, wizard state, cross-component UI). Populate server-derived store state through `useAsyncData` + `callOnce` to avoid refetching on client navigation.
- **BFF pattern (shape A):** components call **your own** `server/api` routes (same-origin), and those routes call the upstream Node/Prisma API with the server-held token. The browser never sees the upstream base URL or credentials.

## 4. Schemas, Types & the Boundary (Zod)

- **One schema, both sides:** define Zod schemas in `shared/schemas`. Nitro server routes validate incoming payloads with them (`await readValidatedBody(event, schema.parse)`); the client validates forms and API responses with the same schemas. Derive types with `z.infer` — never hand-maintain parallel interfaces.
- **Consuming the backend (shape A):** generate a typed, Zod-validated upstream client from the backend's OpenAPI (`orval` / `openapi-zod-client`) and use it inside `server/utils` — so the BFF↔backend contract stays in lockstep with `shared-api-conventions.md`.
- **Implementing the contract (shape B):** generate OpenAPI _from_ these Zod schemas (`zod-openapi`) and follow the backend prompt's API rules for the `server/` layer.
- **Form ↔ request ↔ error mapping:** the same Zod schema backs `<UForm :schema>` and the outgoing request DTO; backend `422` field errors map onto the form via `form.setErrors([{ path, message }])` (shape defined in `shared-api-conventions.md`).

## 5. Runtime Config & Secrets

Nuxt's server layer is a real advantage here: **secrets can stay server-side**, unlike the pure SPA.

- **`runtimeConfig` in `nuxt.config.ts`:** top-level keys are **private/server-only** (upstream API secret, session secret, DB URL for shape B); `public: {}` is exposed to the client. Values are overridden at runtime by env: `NUXT_*` → private, `NUXT_PUBLIC_*` → public. Access via `useRuntimeConfig()` (server sees all, read-only; client sees only `public`/`app`).
- **Never** put a secret outside `public` and then read it in a component — client code only ever receives `public`. Secrets are read in `server/` code (routes, utils, plugins).
- **Validate config with Zod at boot** using `nuxt-safe-runtime-config` (accepts Zod/Standard Schema) → typed `useSafeRuntimeConfig()`. This is the Nuxt analog of the backend's "validate env at startup, fail fast."
- **`app.config.ts`:** non-sensitive, build-time public config (theme, feature flags, titles) — cannot be overridden by env; don't put anything sensitive here.
- **Secret storage (shape B / deployment):** local dev via gitignored `.env` (Nitro reads it); production via the platform's secrets manager injected as `NUXT_*` env vars. Same guidance as the backend prompt — no plaintext secrets committed.

## 6. Security

- **`nuxt-security` module** (OWASP-Top-10 + Helmet-based) for security headers, HSTS, and **CSP** — it handles nonce generation, inline-script hashing, merging, and SSR/hydration compatibility, which is fiddly to hand-roll via `routeRules`. (Nuxt is also moving toward first-class CSP.)
- **SSR-specific XSS:** avoid `v-html` (sanitize with DOMPurify if unavoidable); never `eval`/`new Function`/string `setTimeout` on user input. CSP matters more here because SSR emits HTML directly.
- **Auth (shape A):** keep tokens in **httpOnly, Secure, SameSite cookies** handled by the BFF; do the token/refresh dance in `server/` so the browser never holds the upstream token. Route middleware guards are UX only.
- **Authorization is server-side.** In shape A the upstream backend is authoritative; in shape B enforce role + object-level ownership checks in `server/` (per the backend prompt). Never trust client route guards for authorization.
- **Dependencies:** `pnpm audit` / Dependabot in CI; keep Nuxt and modules current.

## 7. Rendering, SEO & Performance

- **Per-route rendering via `routeRules`:** mix SSR, SSG/prerender (`nitro.prerender`), ISR, SWR, and client-only per route — e.g. prerender marketing pages, SSR authenticated pages, SWR for semi-static data. This is Nuxt's main scalability lever; use it deliberately.
- **Nitro caching:** cache expensive server routes/upstream calls with `cachedEventHandler`/route-rule cache and a storage driver (e.g. Redis) where appropriate.
- **SEO:** `useSeoMeta` / `useHead` for per-page metadata; this is often the whole reason to use Nuxt, so treat it as first-class.
- **Assets & bundle:** `@nuxt/image` for responsive/optimized images; lazy-load heavy components; keep payloads lean (don't over-serialize into `useState`/payload); analyze the bundle before shipping.
- **Observability:** instrument the **Nitro server** with OpenTelemetry initialized in a **Nitro plugin** (`server/plugins/instrumentation.ts`) or a Nuxt/Nitro OTel module — **not** `nuxt.config` hooks (too late); blocklist health-check paths from spans. Instrument the **client** with Core Web Vitals (`web-vitals`) and `traceparent` propagation to the BFF so browser → Nitro → upstream is one trace. Vendor-neutral over OTLP → Collector; full guidance in `observability.md`.

## 8. Error Handling

- **Client/render:** an `error.vue` boundary for fatal errors; `createError` + `showError` for controlled failures; `useError` to inspect. Handle loading/error/empty states explicitly on every async view.
- **Server routes:** throw h3 `createError({ statusCode, statusMessage, data })`; map failures to the response envelope and canonical error codes from `shared-api-conventions.md` (esp. `422` field-error shape). Never leak stack traces or upstream internals to the client.
- Propagate trace context (`traceparent`, plus the human-facing `x-request-id`) through BFF calls so a UI error is traceable to the backend logs as one trace (see `shared-api-conventions.md` §6 and `observability.md`).

## 9. Testing

- **Unit (Vitest via `@nuxt/test-utils`):** composables, stores, server-route utilities, and pure logic. Use `mockNuxtImport`/`registerEndpoint` to isolate from real network/Nuxt auto-imports.
- **Component (Vitest + `@nuxt/test-utils` / Vue Test Utils):** render components in a Nuxt context; assert behavior and emitted events, not implementation details.
- **E2E (Playwright):** critical journeys against a built app; use **stable locators** (`data-testid`, ARIA roles), never CSS/structural selectors.
- Mock upstream/server routes at the boundary (MSW or Nuxt's `registerEndpoint`). Aim for meaningful coverage of logic and critical paths, not a gamed number.

## 10. Code Quality & Formatting

- **`@nuxt/eslint`** (project-aware flat config, `eslint.config.mjs`) + `eslint-plugin-vuejs-accessibility` + Prettier, enforced in CI + pre-commit. (A first-party Nuxt a11y module is planned for v5; until then the ESLint plugin covers it.)
- **`nuxt typecheck`** in CI — the build alone won't catch all type errors, and Nuxt's per-context tsconfigs matter (app vs server vs shared).
- **Conventions:** `<script setup lang="ts">`; `defineProps`/`defineEmits` with generic type args; `defineModel` for two-way binding; multi-word component names; consistent SFC block order; scoped styles.
- **TSDoc** on public composables, server utilities, and non-obvious logic — explain the _why_ and invariants, not types the compiler already knows.
- Prefer Nuxt Layers / composables for reuse; avoid circular imports (share via `shared/`); keep pages and components thin.
