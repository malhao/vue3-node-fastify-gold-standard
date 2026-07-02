# Shared API Conventions (Frontend ↔ Backend Contract)

This document is the **single source of truth** for the interface between the Node.js/Prisma backend and the Vue 3 frontend. Both master prompts reference it. When they disagree with this document, **this document wins**. Keep it in version control alongside both apps (or in a shared package) and change it deliberately — a change here is a change to the contract.

**Why standalone (not duplicated in each prompt):** duplicating the contract in both prompts guarantees drift — the exact failure mode the whole stack is designed to avoid. One authoritative document, referenced by both, keeps the generated client and the backend implementation honest.

## 0. Source of Truth & Flow

- Zod schemas in the **backend** define validation + types, and generate the **OpenAPI** spec (via `zod-openapi`).
- The **frontend** generates its typed, Zod-validated API client from that OpenAPI spec (via `orval` / `openapi-zod-client`).
- Therefore: **schemas → OpenAPI → client**. Neither side hand-writes types for the other. A CI check on the frontend should fail if the committed client is stale relative to the published spec.

## 1. Transport Basics

- **Base path & versioning:** all endpoints under `/api/v{n}`, starting `/api/v1`. URL-path versioning. Default to additive, backward-compatible evolution; bump the major version only for genuine breaking changes; keep ≤2 live versions.
- **Content type:** `application/json; charset=utf-8` for request and response bodies.
- **Methods & status:** standard HTTP semantics — `GET` (read), `POST` (create), `PUT`/`PATCH` (replace/update), `DELETE` (remove). `201` on create (with `Location`), `204` on empty success, `409` on conflict, `422` on validation failure.
- **Deprecation:** deprecated endpoints/versions send `Deprecation: true` and a `Sunset: <HTTP-date>` header. The frontend logs (not crashes) on seeing these.

## 2. Response Envelope

**Every** response uses one of two shapes. No bare arrays, no bare scalars.

**Success:**

```json
{
  "data": {},
  "meta": {}
}
```

- `data` — the resource or array of resources.
- `meta` — optional; present for lists (pagination, see §4) and where extra context is useful. Omit or `{}` when not needed.

**Error:**

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User 42 was not found.",
    "details": [],
    "requestId": "01J..."
  }
}
```

- `code` — stable, machine-readable `SCREAMING_SNAKE_CASE`. **The frontend branches on `code`, never on `message`.**
- `message` — human-readable, safe to surface; never leaks internals/stack traces.
- `details` — optional structured context (see §3 for the validation-error shape).
- `requestId` — correlation id (see §6), echoed for support/tracing.

## 3. Errors & Validation

- **HTTP status ↔ meaning:** `400` malformed request, `401` unauthenticated, `403` authenticated-but-forbidden, `404` not found, `409` conflict, `422` semantic validation failure, `429` rate-limited, `5xx` server fault.
- **Canonical error `code` values** (extend as needed, keep stable): `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- **Validation errors (`422`)** carry field-level detail so the frontend can map them onto form fields:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submitted data is invalid.",
    "details": [
      { "path": "email", "message": "Must be a valid email." },
      { "path": "address.postcode", "message": "Required." }
    ]
  }
}
```

- `path` uses **dot notation** for nested fields, matching how the frontend addresses form fields. This maps directly onto Nuxt UI's `form.setErrors([{ path, message }])`.
- The frontend validates with the same Zod schema **before** submit (fast UX) but always treats the backend `422` as authoritative.

## 4. Pagination

- **Default: cursor (keyset) pagination.** Request: `?limit=<n>&cursor=<opaque>`. `limit` has a documented default and hard max (e.g. default 20, max 100).
- **List response:**

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "nextCursor": "eyJpZCI6MTIzfQ==",
      "hasMore": true,
      "limit": 20
    }
  }
}
```

- `nextCursor` is `null` when there are no more pages. Cursors are opaque, base64-encoded, and must not be constructed or parsed by the client.
- **Offset pagination** (`?page=&pageSize=`) is permitted only for small, bounded, admin-style lists; when used, `meta.pagination` carries `page`, `pageSize`, and `total`.

## 5. Authentication & Authorization

- **Mechanism:** prefer short-lived access tokens delivered via **httpOnly, Secure, SameSite cookies** with a refresh mechanism, over storing tokens in `localStorage`. If a `Bearer` scheme is used instead, the frontend attaches `Authorization: Bearer <token>` in the central HTTP wrapper.
- **401 vs 403:** `401` = not authenticated (frontend redirects to login / triggers refresh). `403` = authenticated but not allowed (frontend shows a forbidden state; never retries blindly).
- **Authorization is the backend's job.** Frontend route guards are UX only. Object-level ownership is enforced server-side in the service layer — the client is never trusted for authorization.
- **Token refresh:** on `401` for an expired token, the client attempts a single refresh then retries once; a second `401` logs the user out.

## 6. Correlation & Trace Propagation

- **Distributed tracing (primary):** every hop propagates context using **W3C Trace Context** (`traceparent` / `tracestate`) plus **baggage**, so a single request is one trace from browser → BFF → backend → DB. This is the authoritative correlation mechanism; see `observability.md` for how it's implemented per tier.
- **`x-request-id` (human-facing):** retained as a support-friendly reference. If the client sends one the server honors it; otherwise the server generates it and returns it in the response header **and** in `error.requestId`. Where a trace exists, `x-request-id` is derived from / maps to the `trace_id` so a reference resolves to a full trace.
- The frontend surfaces `requestId` in error reports/toasts (e.g. "Reference: 01J…") so a user-reported issue is traceable end-to-end in the backend's structured, trace-correlated logs.

## 7. Data Type Conventions

- **Timestamps:** ISO 8601 in **UTC** (`2026-07-02T14:30:00Z`). The client formats to local time for display.
- **IDs:** strings (even if numeric server-side), to avoid precision loss and ease future migration to UUID/ULID.
- **Money / exact decimals:** integer minor units (e.g. cents) **or** decimal strings — never floats.
- **Enums:** stable lowercase string values (`"active"`, `"pending_review"`), not integers.
- **Absent vs null:** `null` means "known to be empty"; an omitted field means "not provided/unchanged" (relevant for `PATCH`).

## 8. Idempotency, Rate Limits & CORS

- **Idempotency:** unsafe-but-retryable `POST`s (payments, resource creation) accept an `Idempotency-Key` header; the server returns the original result for a repeated key.
- **Rate limiting:** `429` responses include `Retry-After` and standard `RateLimit-*` headers. The frontend backs off and surfaces a friendly "try again shortly" state rather than hammering. (Application-layer limiting mitigates brute-force/abuse only — volumetric DDoS is handled at the edge/CDN.)
- **CORS:** the backend uses an explicit origin allowlist (no wildcard in production); the frontend origin(s) are registered there per environment.

## 9. Change Management

- Additive changes (new optional fields, new endpoints, new enum values the client tolerates) do not require a version bump; removals/renames/type-changes do.
- Any change to this contract is reflected in the backend Zod schemas → regenerated OpenAPI → regenerated frontend client, in that order, ideally in a single PR (or coordinated pair) so the two sides never drift.
