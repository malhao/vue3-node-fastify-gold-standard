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
