# CLAUDE.md

Project context and working agreement for Claude Code. Read this first, then the spec documents in `/docs` before scaffolding or writing code.

## What this repo is

A **pnpm monorepo** containing a "gold-standard" full-stack TypeScript application:

- **`apps/api`** — Node.js + TypeScript + Prisma/PostgreSQL backend.
- **`apps/web`** — Vue 3 **Vite SPA** frontend (this project does **not** use Nuxt — it's an authenticated app, no SSR/SEO requirement, which is the SPA branch of the decision tree in `/docs/README.md`).
- **`packages/*`** — shared code (see structure below).

Everything is built to the specifications in `/docs`. Those documents are the source of truth; this file only adds repo-level workflow and conventions.

## Authoritative specs (in `/docs`)

Treat these as the spec. When in doubt, follow them; if one is ambiguous or conflicts with reality, ask rather than guess.

- `nodejs-master-prompt.md` — backend architecture and requirements.
- `vue3-master-prompt.md` — frontend (Vite SPA) architecture and requirements.
- `shared-api-conventions.md` — **authoritative** API contract (response envelope, error codes, pagination, auth, W3C trace propagation). Both apps conform to it.
- `observability.md` — vendor-neutral OpenTelemetry standard across all tiers.
- `README.md` — index + decision tree (already resolved to the SPA path for this repo).

`nuxt-master-prompt.md` is **not** used here (it's for the Nuxt variant of this stack).

## Before installing or integrating ANY library — two required steps

The specs pin specific versions and tools, but the ecosystem moves fast. Do **not** trust version numbers or API details from the spec (or from training data) verbatim.

**1. Verify the current version at install time.**

- Check the latest stable release (npm registry / the project's releases) before pinning.
- Honor the spec's _intent_, not its literal number: where it says a floor (e.g. "Nuxt UI v4+", "Node Active LTS", "Vite 8 / Rolldown", "Zod", "Pinia Colada"), install the current version that satisfies that floor.
- If a pinned choice has **materially changed** since the spec was written — a rename, a merge, a deprecation, a new major with breaking changes, or a shift in the recommended approach — stop and flag it, propose the current equivalent, and note it in `/docs` (or a `DECISIONS.md`) rather than silently diverging.

**2. Read the library's own current docs — check for `llms.txt` first.**

- For each significant dependency, look for a machine-readable docs surface before writing integration code: `https://<docs-domain>/llms.txt` (an index of key pages) and `https://<docs-domain>/llms-full.txt` (fuller export). Many doc sites also serve Markdown via a `.md` URL suffix or `Accept: text/markdown`.
- Fetch the relevant linked pages and write integration code against **those**, not against remembered APIs. This is especially important for the fast-moving pieces here: Prisma, Zod (schema/OpenAPI generation), OpenTelemetry JS, Vite, Pinia Colada, `zod-openapi`, and the OpenAPI→client generator.
- If no `llms.txt` exists, fall back to the official docs site and the package README/CHANGELOG for the installed version.

Prefer official scaffolders over hand-rolling: `create-vue` for the SPA, `prisma init` for the backend, `@nuxt/eslint`-style project configs where applicable.

## Monorepo conventions

- **pnpm workspaces** (`pnpm-workspace.yaml`). Node via Active LTS; commit a `.nvmrc`/`.node-version`.
- Suggested layout (confirm the orchestrator choice first — see Open Decisions):

```
/apps
  /api            # Node/Prisma backend  (see nodejs-master-prompt.md)
  /web            # Vue 3 Vite SPA        (see vue3-master-prompt.md)
/packages
  /schemas        # shared Zod schemas / DTOs (single source of truth)
  /api-client     # typed client generated from the API's OpenAPI (Zod-validated)
  /config         # shared tsconfig, eslint, prettier presets
  /observability  # shared OTel setup helpers (vendor-neutral)
/docs             # the spec documents above
```

- The API generates OpenAPI from its Zod schemas; the web app's `api-client` is **generated** from that spec — never hand-maintained. Wire this as a script so it can be regenerated and checked in CI.
- Root scripts orchestrate per-package `build` / `typecheck` / `lint` / `test`.

## Build in verifiable slices (not one big bang)

Work in order, and prove each slice compiles/lints/tests green before moving on:

1. **Workspace skeleton** — pnpm workspaces, shared tsconfig/eslint/prettier, CI stub.
2. **Backend skeleton that compiles** — app wiring, config validation, Prisma schema + first migration, health endpoints, error handler, Pino logging.
3. **One vertical feature end-to-end** — Zod schema → API route (validated) → OpenAPI → generated client → a Vue view that uses it. This proves the whole contract works before scaling out.
4. **Testing** — Vitest units; Testcontainers-backed integration tests for the API; Playwright E2E for the web app.
5. **Observability** — OTel wiring (traces + metrics) exporting via OTLP to a local Collector; Pino/trace correlation; Web Vitals on the client.

Don't scaffold all features up front. Get one slice truly working, then repeat.

## Public repository — hygiene (this repo will be public)

- **Never commit secrets.** No real API keys, tokens, connection strings, or `.env` files. Commit only `.env.example` with placeholder keys; keep real `.env` gitignored. If a secret is ever committed, treat it as compromised and rotate it — scrubbing history is not enough.
- Provide `.gitignore`, `LICENSE` (pick one deliberately), `README.md`, `CONTRIBUTING.md`, and `SECURITY.md`.
- Enable/assume CI with **`pnpm audit`** and **Dependabot** (or equivalent); pin via the lockfile.
- Use **CI secrets** (e.g. GitHub Actions encrypted secrets) or a secrets manager for anything real — never inline.
- No internal hostnames, private URLs, customer data, or real PII in code, fixtures, seed data, or issue templates. Use synthetic sample data.
- Consider Conventional Commits + a basic PR template so external contributors have a clear path.

## Open decisions to confirm before coding

Ask me (or record the choice in `DECISIONS.md`) rather than assuming:

1. **Monorepo orchestrator** — pnpm workspaces alone, or add **Turborepo/Nx** for task caching. (Specs standardize on pnpm but don't pick an orchestrator.)
2. **Backend framework** — **Express 5** (spec default) vs **Fastify** (built-in schema validation + Pino).
3. **Deployment target** — determines the production secrets strategy (platform secrets manager vs `dotenvx`) and CI setup.
4. **Observability backend** — stays deliberately **deferred**: wire OTel + a local Collector now; leave the vendor/exporter destination configurable via `OTEL_*` env. Don't couple app code to a vendor.
5. **Node LTS line** — confirm the exact Active LTS major to pin.

## Working agreement

- Run **typecheck + lint + tests** before declaring any slice done; a slice isn't finished until it's green.
- **Every new test must fail first.** Before wiring up (or against already-written) code, confirm the test is **red** for the right reason — remove/break the implementation and watch it fail — then make it green. A test that passes without the code under test proves nothing.
- **Bookend every piece of work with a short summary.** Before building/changing/documenting anything, print a brief note of what you're about to do; after, print a brief note of what you did. Keep both to a few lines — no walls of text.
- Keep observability and config **vendor-neutral** (only the Collector config / `OTEL_*` env knows a vendor).
- Validate at boundaries with Zod; derive types with `z.infer`; never hand-maintain parallel types.
- Match the specs' **proportionality** principle — don't over-build small utilities.
- If you diverge from a spec for a good reason (e.g. a library changed), say so explicitly and update `/docs` or `DECISIONS.md` so the spec and the code stay in sync.
