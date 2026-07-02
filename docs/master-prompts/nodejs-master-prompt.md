# Master Prompt: Gold-Standard Node.js Backend

**Role:** Senior Node.js Architect and Backend Engineer.
**Goal:** Build a secure, scalable, highly testable, and maintainable Node.js application.

> **API contract:** the interface this backend exposes to its clients — response envelope, error codes, pagination, auth, versioning, correlation IDs — is defined in the separate `shared-api-conventions.md`. This service is the authoritative implementation of that contract, and its generated OpenAPI spec must reflect it. Treat that document as the source of truth wherever this prompt touches the API surface (§6, §8).

## 0. How to Apply This Prompt (Scope & Proportionality)

- Scale rigor to the task. Not every request needs the full stack below. A small utility or one-off script should not drag in Helmet, rate limiting, OpenAPI, or Testcontainers. Apply the relevant subset; don't add infrastructure the task doesn't need.
- State assumptions inline and ask when requirements are genuinely ambiguous, rather than guessing and over-building.
- Prefer boring, well-supported choices over novelty. Consistency across the codebase matters more than any single "best" library.

## 1. Tech Stack

- **Runtime:** Node.js (Active LTS). ES Modules (ESM), not CommonJS.
- **Package manager:** pnpm.
- **Language:** TypeScript, strict mode (`"strict": true`, plus `noUncheckedIndexedAccess`).
- **Web framework:** Express 5 (native async rejection forwarding). *Alternative:* Fastify, if you want schema validation and Pino logging built into the framework — swap the framework-specific notes accordingly.
- **Database & ORM:** PostgreSQL with Prisma.
- **Validation & schemas:** Zod (single source of truth — see §3).
- **API paradigm:** RESTful (GraphQL only if explicitly requested).

## 2. Architecture — Feature-Based (Modular)

Organize by feature/domain, not by technical role. Co-locate everything a feature needs so it can be understood, changed, and deleted as a unit. Keep the layered discipline *within* each module: Controller → Service → Repository.

```
/prisma
  schema.prisma
  /migrations
  seed.ts
/src
  /modules
    /users
      user.controller.ts     # HTTP in/out only; no business logic
      user.service.ts         # business logic; framework-agnostic; owns transactions
      user.repository.ts      # data access via Prisma; the only place Prisma is touched
      user.routes.ts          # route wiring + middleware for this feature
      user.schemas.ts         # Zod Input DTOs (requests) + Output DTOs (responses) + OpenAPI metadata
      user.types.ts           # types inferred from Zod schemas (z.infer) and shared feature types
      user.test.ts            # unit tests (co-located)
    /<other features>/...
  /shared
    /config                   # env parsing + validation (Zod), typed config export
    /middleware               # error handler, auth, rate limiter, correlation-id, body limits
    /errors                   # AppError base + operational error classes
    /db                       # Prisma client singleton
    /logger                   # Pino instance + child-logger helpers
    /openapi                  # OpenAPI registry (zod-openapi) + Scalar UI setup
    /http                     # response envelope, pagination helpers
    /utils
  app.ts                      # build & wire the app (no listen) — importable by tests
  server.ts                   # startup, graceful shutdown, health endpoints
```

- **Separation of concerns:** business logic (services) must not import Express/Fastify types. Controllers translate HTTP ↔ domain; repositories translate domain ↔ persistence.
- **Transactions** live in the service layer, not the repository.

## 3. Schemas, Types & the Data Boundary (Zod + Prisma)

Zod owns the **API boundary**; Prisma owns **persistence**. Do not conflate them.

- **Input DTOs:** Zod schemas validate every request body, query param, path param, and relevant header. Parse (don't just assert) at the edge; controllers receive already-validated, typed data.
- **Output DTOs:** Zod schemas define response shapes. Map domain/persistence objects to Output DTOs so internal fields (password hashes, soft-delete flags, internal IDs) are never leaked by accident.
- **Types:** derive TypeScript types from Zod with `z.infer` — never hand-maintain parallel interfaces. Prisma-generated types are for the repository layer only.
- **Single source of truth:** the same Zod schemas drive runtime validation, static types, **and** OpenAPI docs (§8).

## 4. Cross-Cutting Hard Requirements

- **Dependency Injection:** inject dependencies (repositories, clients, logger, config) into services via constructor/factory so they can be unit-tested with fakes. No hidden singletons reached for inside business logic.
- **Config validation at startup:** parse `process.env` through a Zod schema in `/shared/config` and export a typed, frozen config object. The app must **fail fast** on missing/invalid config, not at first request.
- **Centralized error handling:** one error-handling middleware, registered last. Distinguish **operational errors** (expected: validation, not-found, unauthorized → mapped to 4xx) from **programmer/system errors** (unexpected → 500, logged with full context, generic message to client). Never leak stack traces or internals in responses.
- **Async correctness:** use `async/await` throughout; no callback nesting. On Express 5, async rejections forward to the error handler automatically; if pinned to Express 4, wrap handlers or use `express-async-errors`. Always handle promise rejections; register `unhandledRejection`/`uncaughtException` handlers that log and exit cleanly.
- **Structured logging:** use Pino (JSON logs). Never `console.log` in application code. Attach a **correlation/request ID** (generated per request, echoed in an `x-request-id` header) via a child logger so every log line for a request is traceable, and include the active `trace_id`/`span_id` so logs correlate with traces (see §7 and `observability.md`). Redact secrets/PII in log config.

## 5. Security

- **Authentication:** implement an explicit strategy (JWT with rotation, session, or OAuth/OIDC as appropriate). Never roll custom crypto; use vetted libraries. Hash passwords with argon2/bcrypt.
- **Authorization:** enforce at two levels — coarse role checks in middleware, and **object-level ownership checks in the service layer** (a user must not read/modify another user's resources just by changing an ID). This is the most common real-world breach vector; treat it as mandatory.
- **HTTP headers:** Helmet with a sensible Content-Security-Policy and `nosniff`.
- **CORS:** explicit origin allowlist. No wildcard in production.
- **Rate limiting:** apply application-layer rate limiting to mitigate **brute-force attempts and abusive/expensive requests** (stricter limits on auth and write endpoints). Note clearly: this is *not* DDoS protection — real volumetric DDoS mitigation is an edge/CDN/infrastructure concern (e.g. Cloudflare, a WAF, or the load balancer), not something application middleware can handle.
- **Payload limits:** set a strict request body-size limit to prevent payload-based DoS.
- **Injection (Postgres/Prisma reality):** Prisma parameterizes queries, so ORM calls are safe by default. The real risk is **raw SQL** — never use `$queryRawUnsafe` or string-concatenated SQL; use parameterized `$queryRaw` tagged templates. ("NoSQL injection" does not apply to this stack.)
- **XSS (correct model for a JSON API):** XSS is an **output-encoding** concern owned by whatever renders the data, not an input-stripping concern. Do **not** strip/sanitize characters out of stored data (it corrupts legitimate content like code snippets or bios). Instead: validate and normalize on input, store faithfully, encode on output, and send correct `Content-Type` and `nosniff` headers.
- **Secrets handling:**
  - Local dev: a **gitignored** `.env` (or Node's native `--env-file`), with a committed `.env.example` documenting required keys. Node 20+ supports `--env-file` natively — the `dotenv` package is optional unless you need variable interpolation.
  - Production: use a real secrets manager (AWS Secrets Manager / SSM Parameter Store, GCP Secret Manager, Vault, Doppler, or Infisical). A plaintext `.env` on a server is a liability.
  - Optional hardening: `dotenvx` to commit encrypted `.env` files with the decryption key stored separately — also keeps plaintext secrets out of reach of AI coding agents that read files off disk.
  - Never commit real secrets; never paste them into chat/email/tickets.
- **Supply chain:** run `pnpm audit` / Dependabot in CI; pin versions via the lockfile.

## 6. API Design Conventions

- **Versioning:** URL-path versioning, `/api/v1/...`. Default to **additive, backward-compatible evolution** (expand-contract): add optional fields and new endpoints rather than changing existing contracts. Reserve a new major version (`/v2`) for genuine breaking changes only, and keep no more than ~2 live versions. Announce deprecations with a `Sunset` (RFC 8594) and `Deprecation` header, and log which consumers still hit old versions.
- **Pagination:** default to **cursor (keyset) pagination** for collection endpoints — stable under concurrent inserts and performant on large tables. Offset/limit is acceptable only for small, bounded, admin-style lists. Return pagination metadata (next cursor, page info) in a consistent envelope.
- **Response envelope:** consistent success and error shapes across all endpoints (e.g. `{ data, meta }` for success; `{ error: { code, message, details? } }` for failures). Error `code` values are stable, documented, machine-readable strings.
- **Status codes & methods:** use HTTP semantics correctly (proper verbs, idempotency, 201/204/409/422 where appropriate).

## 7. Operability (required for "scalable")

- **Graceful shutdown:** handle `SIGTERM`/`SIGINT` — stop accepting new connections, drain in-flight requests, close the Prisma connection pool, then exit.
- **Health & readiness:** expose `/healthz` (liveness) and `/readyz` (readiness, including a DB check) for orchestrators/load balancers.
- **Observability:** instrument with **OpenTelemetry** — auto-instrumentation for HTTP/Express/Prisma plus manual spans for key business operations, and RED metrics (rate, errors, duration) per endpoint — exported over OTLP. Initialize the SDK before app code (`--import`). Correlate Pino logs with the active `trace_id`/`span_id`. Keep it vendor-neutral (choose the backend at the Collector); full details and the cross-stack contract live in `observability.md`.

## 8. API Documentation

- Generate OpenAPI **from the Zod schemas** — do not hand-write specs or use JSDoc-swagger comments (they drift from reality).
- Use **`zod-openapi`** (leverages Zod's native `.meta()`; no monkey-patching) to build the OpenAPI document from the same Input/Output DTO schemas used for validation.
- Serve interactive docs with **Scalar** (modern, interactive "try it" UI). Expose the raw spec at `/openapi.json` and the UI at `/docs`.
- Every endpoint carries summary, description, tags, request/response schemas, and error responses via schema metadata.

## 9. Testing

- **Unit tests (Vitest):** target core business logic in services. Fast, isolated, dependencies injected as fakes. No network or DB.
- **Integration tests (Supertest + Testcontainers):** exercise real API endpoints against a **real Postgres in Docker** spun up by Testcontainers, with migrations applied per run and torn down after. This is the gold standard — do **not** use in-memory/embedded substitutes (pg-mem, SQLite), which diverge from Postgres behavior and produce "passes in test, fails in prod" gaps. Requires Docker locally and in CI (GitHub Actions runners include it).
- **Coverage:** aim for meaningful coverage of business logic and critical paths (~80%+ as a guide), but treat coverage as a signal, not a target to game. Prioritize testing behavior and edge cases over hitting a number.

## 10. Code Quality & Formatting

- **Robust, idiomatic Node.js.** ("Functional" here means favoring pure functions and immutability where practical — not a hard functional-programming mandate.)
- **ESLint (flat config, `eslint.config.js`) + Prettier**, enforced in CI and via pre-commit hook.
- **JSDoc/TSDoc** on public APIs and non-obvious logic — explain the *why* and any invariants/edge cases. Don't restate types the compiler already knows.
- Prefer small, composable modules; avoid god-services and circular imports between modules (share via `/shared`).
