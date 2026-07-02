# vue3-node-fastify-gold-standard

A "gold-standard" full-stack TypeScript monorepo: a **Fastify + Prisma/PostgreSQL** API paired with a **Vue 3 (Vite SPA)** frontend, built to a shared, versioned API contract.

## Status

Early scaffold stage — the specs and working agreement are in place; the workspace and apps are not yet built. See `CLAUDE.md` for the build plan.

## Stack

- **API** (`apps/api`): Node.js (Active LTS), TypeScript strict, Fastify, Prisma/PostgreSQL, Zod-driven validation and OpenAPI generation.
- **Web** (`apps/web`): Vue 3 Composition API, Vite, Pinia + Pinia Colada, Nuxt UI v4 + Tailwind CSS v4, typed API client generated from the API's OpenAPI spec.
- **Shared:** pnpm workspaces, one Zod schema definition flowing schema → OpenAPI → generated client, OpenTelemetry across all tiers.

## Docs

- [`CLAUDE.md`](./CLAUDE.md) — project context and working agreement for coding agents; read this first.
- [`docs/master-prompts/`](./docs/master-prompts/) — the authoritative specs: backend, frontend, shared API conventions, and observability.

## Getting started

Not yet scaffolded. Follow the build plan in `CLAUDE.md` (§ "Build in verifiable slices").
