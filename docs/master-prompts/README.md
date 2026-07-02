# Full-Stack Master Prompts

A matched set of "gold-standard" master prompts for building a modern TypeScript full-stack application, plus the shared contract that binds the frontend and backend together. Drop the relevant file into a coding agent's system prompt / `CLAUDE.md`, or use it as an architecture checklist for a human team.

They're designed to be used **together**: same core libraries, same conventions, one shared API contract — so a backend and frontend built from these prompts fit without drift.

## The documents

| File                                                       | Use it for              | One-liner                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`nodejs-master-prompt.md`](./nodejs-master-prompt.md)     | The API / backend       | Node.js + TypeScript + Prisma/PostgreSQL, layered + feature-based, Zod-driven OpenAPI.                                                     |
| [`vue3-master-prompt.md`](./vue3-master-prompt.md)         | Frontend — **Vite SPA** | Vue 3 SPA for authenticated apps where SEO doesn't matter.                                                                                 |
| [`nuxt-master-prompt.md`](./nuxt-master-prompt.md)         | Frontend — **Nuxt**     | Nuxt 4 when you need SSR/SEO or a server/BFF layer.                                                                                        |
| [`shared-api-conventions.md`](./shared-api-conventions.md) | The contract            | Response envelope, error codes, pagination, auth, versioning, trace/correlation propagation. **Authoritative** — both sides conform to it. |
| [`observability.md`](./observability.md)                   | Logs, metrics, traces   | Vendor-neutral OpenTelemetry standard across all tiers. Instrument once, choose the backend vendor later.                                  |

## Which frontend prompt?

Pick **one** frontend prompt per app. The deciding question is whether you need a server:

```
Do you need any of: SEO / social previews, SSR or SSG,
public marketing pages, edge rendering, or a server layer
that holds auth tokens & proxies APIs (a BFF)?
│
├─ NO  →  vue3-master-prompt.md   (Vite SPA)
│         Authenticated dashboards, internal tools, admin panels,
│         anything behind a login. Simplest setup, no server to run.
│
└─ YES →  nuxt-master-prompt.md   (Nuxt 4)
          Then decide the shape (covered in that prompt's §0):
          ├─ Keeping the separate Node/Prisma backend?
          │     → Nuxt as Presentation + BFF (default).
          │       Nitro server layer fronts the backend, holds the
          │       auth cookie, does SSR fetching.
          └─ No separate backend?
                → Full-stack Nuxt. Nitro server routes ARE the API;
                  the Node backend prompt's rules apply to server/.
```

Rule of thumb: **default to the SPA** and only reach for Nuxt when a concrete requirement (usually SEO or server-side token handling) demands it. Don't adopt Nuxt reflexively.

## How the pieces fit together

The through-line is **one schema definition flowing end to end**, so types, validation, docs, and the client never drift:

```
Prisma schema ──▶ Zod schemas ──▶ OpenAPI spec ──▶ typed API client
 (persistence)    (validation      (generated       (generated for the
                   + types)         from Zod)         frontend, Zod-validated)
```

- The **backend** owns validation and generates OpenAPI from its Zod schemas.
- The **frontend** generates its typed, Zod-validated client from that OpenAPI.
- **`shared-api-conventions.md`** is the human-readable contract both sides implement; when a prompt and the contract disagree, the contract wins.
- Change flow: update Zod schemas → regenerate OpenAPI → regenerate the client, ideally in one coordinated change.

## Shared stack (consistent across all prompts)

- **Language / tooling:** TypeScript (strict), pnpm, ESLint flat config + Prettier, Vitest.
- **Validation:** Zod everywhere — the single source of truth for runtime checks, inferred types, and generated docs/clients.
- **Frontend UI:** Nuxt UI v4+ (`@nuxt/ui@^4`) + Tailwind CSS v4, built on Reka UI; forms via `<UForm :schema>` with Zod (no separate form library).
- **Frontend state:** Pinia (client state) + Pinia Colada (server-state cache).
- **Testing fidelity:** real dependencies over mocks where it matters — Testcontainers (Postgres) for backend integration tests; Playwright with stable locators for E2E.
- **Observability:** OpenTelemetry everywhere (traces + metrics), Pino logs correlated by trace id, W3C `traceparent` propagation across tiers — vendor chosen later at the Collector.
- **Structure:** feature-based / modular on every tier.

## Using these prompts well

- **Proportionality is built in.** Each prompt opens with a scope note: scale rigor to the task, don't bolt on infrastructure a small job doesn't need. A 30-line utility shouldn't drag in the full stack.
- **They're starting contracts, not laws.** Where a prompt offers alternatives (e.g. TanStack Query vs Pinia Colada, BFF vs full-stack Nuxt), pick per project and delete the rest so the agent isn't left guessing.
- **Keep them in the repo.** Versioning these alongside the code (and treating `shared-api-conventions.md` as a real contract doc) is what keeps the two sides honest over time.
