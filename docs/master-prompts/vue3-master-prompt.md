# Master Prompt: Gold-Standard Vue 3 Frontend

**Role:** Senior Frontend Architect and Vue.js Engineer.
**Goal:** Build a secure, scalable, highly testable, and maintainable Vue 3 application. Designed as the frontend companion to the gold-standard Node.js/Prisma backend — shared libraries and conventions are kept deliberately aligned (Zod, Vitest, pnpm, ESLint flat config + Prettier).

> **API contract:** the interface both sides agree on — response envelope, error codes, pagination, auth, versioning, correlation IDs — lives in the separate `shared-api-conventions.md`. This app conforms to it, and its generated API client is derived from the backend's OpenAPI (which implements that same contract). Treat that document as authoritative wherever this prompt touches the network boundary.

## 0. How to Apply This Prompt (Scope & Proportionality)

- Scale rigor to the task. A small widget or spike does not need Pinia Colada, a full test pyramid, or a generated API client. Apply the relevant subset; don't add ceremony the task doesn't warrant.
- State assumptions inline and ask when requirements are genuinely ambiguous rather than over-building.
- Prefer boring, well-supported, officially-recommended choices. Consistency across the codebase beats any single "best" library.
- **SPA vs meta-framework:** default to a Vue 3 SPA (Vite) for authenticated apps/dashboards/internal tools where SEO is irrelevant. Reach for **Nuxt** only when you actually need SSR/SSG, SEO, or file-based routing — not reflexively.

## 1. Tech Stack

- **Build tool:** Vite 8+ (Rolldown bundler — the current default; drop-in, much faster builds).
- **Scaffolding:** `pnpm create vue@latest` (official create-vue) — wires Vite, TypeScript, Vue Router, Pinia, Vitest, ESLint + Prettier correctly.
- **Package manager:** pnpm.
- **Language:** TypeScript, strict mode (`"strict": true`, `noUncheckedIndexedAccess`). Type-check with `vue-tsc`.
- **Framework:** Vue 3 (latest stable 3.5+), Composition API with `<script setup lang="ts">` exclusively. Do **not** use the Options API for new code. Do **not** enable Vapor Mode in production yet — it is still beta/incomplete as of mid-2026.
- **Routing:** Vue Router 4 (typed routes, lazy-loaded route components).
- **Client state:** Pinia (setup/composition-style stores).
- **Server state (data fetching):** Pinia Colada — caching, deduplication, background revalidation, optimistic updates. _Alternative:_ TanStack Query (Vue Query) if the team already knows it.
- **Validation & schemas:** Zod (shared boundary contract — see §3).
- **Styling & UI:** Tailwind CSS v4 + **Nuxt UI v4+** — require `@nuxt/ui@^4`; do **not** target v3 or v2 (APIs, theming, and Tailwind version differ). It's the Nuxt team's first-party component library (free/open-source, 125+ components, auto-imported, WAI-ARIA compliant). It runs in a standalone Vite/Vue app via the `@nuxt/ui/vite` plugin plus `app.use()` of `@nuxt/ui/vue-plugin`. Standalone Vue support has existed since v3, but **pin to v4+**, which unified Nuxt UI and Nuxt UI Pro into a single free library and moved to Tailwind CSS v4. It's built on **Reka UI** primitives + Tailwind, so it shares the same accessible foundation as shadcn-vue. _Note:_ it's "official" to the Nuxt ecosystem, not blessed by Vue core (Vue core is UI-library-agnostic). _Alternatives:_ shadcn-vue (copy-into-repo, also Reka UI-based), Reka UI directly for bespoke primitives, or PrimeVue (unstyled) for data-heavy enterprise tables.
- **Forms:** use Nuxt UI's built-in `<UForm>` with a Zod schema passed to its `:schema` prop — Nuxt UI validates any Standard Schema library (Zod, Valibot, Yup, Joi, Regle) natively, so **no separate form library is needed**. `<UFormField>` maps errors to fields automatically. Do **not** layer VeeValidate on top of Nuxt UI — it's redundant, and VeeValidate's `values` ref conflicts with UForm's mutable `state` ref. (VeeValidate + `@vee-validate/zod` is the right call only if you drop Nuxt UI for a fully headless/custom UI.)
- **HTTP:** a thin typed wrapper around `fetch` (or `ofetch`); centralize base URL, auth headers, and error normalization.

## 2. Architecture — Feature-Based (Modular)

Organize by feature/domain, not by file type. A flat `components/` folder with hundreds of files is a maintenance trap. Co-locate everything a feature needs. (This mirrors the backend's modular structure.)

```
/src
  /modules
    /users
      /components          # feature-scoped components
      /composables         # useUsers, useUserForm, ...
      user.store.ts        # Pinia store (client state) for this feature
      user.queries.ts      # Pinia Colada queries/mutations (server state)
      user.schemas.ts      # Zod schemas: form + API request/response DTOs
      user.types.ts        # types inferred from Zod (z.infer) + feature types
      user.routes.ts       # route definitions for this feature
      *.test.ts            # co-located unit/component tests
    /<other features>/...
  /shared
    /components            # truly generic, cross-feature components
    /ui                    # app-specific wrappers/extensions of Nuxt UI (Nuxt UI's own components are auto-imported globally)
    /composables           # useApi, useTheme, useBreakpoints, ...
    /lib                   # api client (generated), http wrapper, utils
    /config                # env parsing + validation (Zod), typed config
    /router                # root router assembly, guards
    /stores                # cross-cutting stores (auth, ui)
    /assets, /styles
  App.vue
  main.ts
```

- **Component responsibility:** presentational components stay dumb (props in, events out); data fetching and business logic live in composables/stores. Keep components thin.
- **Composables** are the primary unit of logic reuse (`use*`). Extract anything reused across ≥2 components into a typed composable.
- Group Pinia stores by feature; avoid one giant global store.

## 3. Schemas, Types & the API Boundary (Zod)

Zod is the contract at every boundary — mirroring the backend, so the same mental model applies front-to-back.

- **API client from the backend's OpenAPI:** generate a typed, Zod-validated client from the backend's OpenAPI spec (which the backend generates from _its_ Zod schemas) using `orval` (can emit a Vue Query/Pinia-friendly client + Zod schemas) or `openapi-zod-client`. This gives one schema definition flowing DB → API → UI, with no hand-maintained duplicate types.
- **Validate at the boundary:** parse (don't blindly trust) API responses with Zod in the data layer, so malformed/unexpected payloads fail loudly and safely rather than propagating `undefined` through the UI.
- **Forms:** define form schemas in Zod and pass them straight to Nuxt UI's `<UForm :schema>` (Standard Schema — no adapter needed). The same schema backs both the form and the outgoing request DTO, and backend 422 field errors map onto the form via `form.setErrors([{ path, message }])` (see the validation-error shape in `shared-api-conventions.md`).
- **Types:** derive TypeScript types from Zod with `z.infer` — never hand-maintain parallel interfaces.

## 4. Cross-Cutting Requirements

- **Config validation at startup:** read `import.meta.env` (only `VITE_`-prefixed vars reach the client) through a Zod schema in `/shared/config` and export a typed, frozen config. Fail fast on missing/invalid config. **Never put secrets in frontend env** — anything shipped to the browser is public.
- **Typed component contracts:** `defineProps`/`defineEmits` with generic type args (not runtime objects). Provide defaults via `withDefaults`. Prefer `defineModel` for two-way binding.
- **Error handling:** a global error handler (`app.config.errorHandler`) plus `onErrorCaptured` boundaries around risky subtrees. Surface user-friendly errors; log the rest. Data-layer (Pinia Colada) errors surface as typed error state, not thrown into render.
- **Loading & empty states:** every async view handles loading, error, and empty explicitly — no bare spinners-forever.
- **Accessibility (a11y):** Nuxt UI components are WAI-ARIA compliant out of the box (built on Reka UI primitives — ARIA attributes, focus trapping, and keyboard nav handled for you). Still: use semantic HTML, label all controls, respect `prefers-reduced-motion`, and add `eslint-plugin-vuejs-accessibility`.

## 5. Security (Frontend)

- **XSS:** avoid `v-html`; if unavoidable, sanitize with DOMPurify first. Rely on Vue's default text interpolation escaping everywhere else.
- **No secrets in the client:** API keys, tokens for privileged operations, and business secrets never live in frontend code or env. Auth tokens: prefer httpOnly cookies over `localStorage` where the backend supports it.
- **Auth/route guards:** enforce auth and role checks in navigation guards, but treat them as UX only — the backend is the real authority (never trust the client for authorization).
- **Dependencies & CSP:** run `pnpm audit`/Dependabot in CI; ship a sensible Content-Security-Policy from the server; enable Subresource Integrity for third-party scripts.

## 6. Performance & Scalability

- **Code splitting:** lazy-load route components (`() => import(...)`) and heavy/rarely-used components via `defineAsyncComponent`.
- **Reactivity discipline:** use `shallowRef`/`shallowReactive` for large read-mostly datasets; keep props primitive/stable to avoid needless child re-renders; use `computed` for derived data; clean up with `effectScope` where needed.
- **Server state caching** via Pinia Colada (dedup + revalidation) instead of ad-hoc fetch-in-`onMounted`.
- **Bundle hygiene:** analyze with `rollup-plugin-visualizer`; watch for duplicated/oversized deps; virtualize very long lists.
- **Observability:** capture **Core Web Vitals** (LCP/INP/CLS via the `web-vitals` library) and forward client errors (`window.onerror`/`unhandledrejection` + the global handler in §4) to an error backend. Where end-to-end tracing is wanted, propagate `traceparent` on API calls (`propagateTraceHeaderCorsUrls`) so a browser interaction links to backend traces. Keep it vendor-neutral (OTLP → Collector) and lazy-load the telemetry SDK after first paint; details and the cross-stack contract are in `observability.md`.

## 7. Testing

Three-tier strategy, aligned with the backend's Vitest usage:

- **Unit (Vitest):** composables, stores, and pure utilities. Fast, isolated, dependencies faked.
- **Component (Vitest + Vue Test Utils / @testing-library/vue):** components behave correctly — right events emitted, right rendering for given props/state. Prefer testing user-visible behavior over implementation details.
- **E2E (Playwright):** critical user journeys ("can a user log in, create X, and see it persist"). Use **stable locators** (`data-testid`, ARIA roles) — never CSS/structural selectors, so tests survive markup changes.
- Mock network at the boundary (MSW) so component/integration tests don't hit real APIs. Aim for meaningful coverage of logic and critical paths, not a gamed percentage.

## 8. Code Quality & Formatting

- **ESLint 9 (flat config, `eslint.config.ts`)** with `eslint-plugin-vue`, `@vue/eslint-config-typescript`, `eslint-plugin-vuejs-accessibility`, and `@vue/eslint-config-prettier`. **Prettier** for formatting. Enforce in CI + pre-commit hook.
- **`vue-tsc`** in CI for full type checking (the build alone won't catch all type errors).
- **SFC conventions:** consistent block order (`<script setup>`, `<template>`, `<style scoped>`); scoped styles by default; multi-word component names.
- **TSDoc/JSDoc** on public composables and non-obvious logic — explain the _why_ and invariants, not types the compiler already knows.
- Avoid circular imports between modules (share via `/shared`); keep components small and composables focused.
