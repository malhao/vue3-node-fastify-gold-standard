# vue3-node-fastify-gold-standard

A "gold-standard" full-stack TypeScript monorepo: a **Fastify + Prisma/PostgreSQL** API paired with a **Vue 3 (Vite SPA)** frontend, built to a shared, versioned API contract.

## Status

Built end to end across all five slices in `CLAUDE.md` (workspace, Fastify API, Tasks vertical feature, tests, and OpenTelemetry). The observability **backend** is deliberately deferred — telemetry exports via OTLP to a local Collector and Web Vitals report to the console until a vendor is wired up (see `DECISIONS.md`).

## Stack

- **API** (`apps/api`): Node.js (Active LTS), TypeScript strict, Fastify, Prisma/PostgreSQL, Zod-driven validation and OpenAPI generation.
- **Web** (`apps/web`): Vue 3 Composition API, Vite, Pinia + Pinia Colada, Nuxt UI v4 + Tailwind CSS v4, typed API client generated from the API's OpenAPI spec.
- **Shared:** pnpm workspaces, one Zod schema definition flowing schema → OpenAPI → generated client, OpenTelemetry across all tiers.

## Docs

- [`CLAUDE.md`](./CLAUDE.md) — project context and working agreement for coding agents; read this first.
- [`docs/master-prompts/`](./docs/master-prompts/) — the authoritative specs: backend, frontend, shared API conventions, and observability.

## Getting started

**Prerequisites:** Node 24 (see `.nvmrc`), pnpm 11, and Docker (for PostgreSQL).

```bash
pnpm install                                    # install; also generates the Prisma client
cp .env.example .env                            # local config (placeholder values are fine)
docker compose up -d postgres                   # start PostgreSQL
pnpm --filter api exec prisma migrate deploy    # apply migrations
pnpm dev                                         # start both apps (prints where each runs)
```

Then open:

| Service | URL |
| --- | --- |
| Web app (Vue) | http://localhost:5173 |
| API docs (Scalar) | http://localhost:3000/docs |
| API health | http://localhost:3000/healthz |

The API has no root route, so http://localhost:3000/ returns 404 by design — use the web app or the endpoints above.

**Common tasks** (run from the repo root): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. The API integration tests and E2E need Docker running. To exercise the full telemetry pipeline, also start the Collector: `docker compose up -d`.
